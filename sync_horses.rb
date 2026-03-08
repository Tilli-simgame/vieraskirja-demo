require 'contentful'
require 'dotenv'
require 'fileutils'
require 'net/http'
require 'json'

Dotenv.load

# Configuration
SPACE_ID      = ENV['CONTENTFUL_SPACE_ID']
ACCESS_TOKEN  = ENV['CONTENTFUL_ACCESS_TOKEN']
STABLE_NAME   = ENV['STABLE_NAME'] || 'Lehmuskartanon Ratsastuskoulu'
OUTPUT_DIR    = '_hevoset'
 
 GENDER_MAP = {
   'stallion' => 'ori',
   'gelding'  => 'ruuna',
   'mare'     => 'tamma'
 }.freeze

abort('Missing CONTENTFUL_SPACE_ID') unless SPACE_ID
abort('Missing CONTENTFUL_ACCESS_TOKEN') unless ACCESS_TOKEN

# ── Rich Text → HTML (simple recursive) ──────────────────────────────────────
def rt_to_html(node)
  return '' unless node
  node = node.raw if node.respond_to?(:raw)  # unwrap Contentful::RichText object

  case node['nodeType']
  when 'document'
    node['content'].map { |c| rt_to_html(c) }.join
  when 'paragraph'
    inner = node['content'].map { |c| rt_to_html(c) }.join
    inner.strip.empty? ? '' : "<p>#{inner}</p>\n"
  when 'heading-1' then "<h1>#{inline_children(node)}</h1>\n"
  when 'heading-2' then "<h2>#{inline_children(node)}</h2>\n"
  when 'heading-3' then "<h3>#{inline_children(node)}</h3>\n"
  when 'unordered-list'
    items = node['content'].map { |li| "<li>#{inline_children(li['content']&.first)}</li>" }.join("\n")
    "<ul>\n#{items}\n</ul>\n"
  when 'ordered-list'
    items = node['content'].map { |li| "<li>#{inline_children(li['content']&.first)}</li>" }.join("\n")
    "<ol>\n#{items}\n</ol>\n"
  when 'blockquote'
    "<blockquote>#{node['content'].map { |c| rt_to_html(c) }.join}</blockquote>\n"
  when 'hr' then "<hr>\n"
  when 'text'
    text = node['value'].to_s
    (node['marks'] || []).each do |mark|
      text = case mark['type']
             when 'bold'      then "<strong>#{text}</strong>"
             when 'italic'    then "<em>#{text}</em>"
             when 'underline' then "<u>#{text}</u>"
             when 'code'      then "<code>#{text}</code>"
             else text
             end
    end
    text
  when 'hyperlink'
    href = node.dig('data', 'uri')
    inner = node['content'].map { |c| rt_to_html(c) }.join
    "<a href=\"#{href}\">#{inner}</a>"
  else
    # fallback: process children if any
    if node['content']
      node['content'].map { |c| rt_to_html(c) }.join
    else
      node['value'].to_s
    end
  end
end

def inline_children(node)
  return '' unless node && node['content']
  node['content'].map { |c| rt_to_html(c) }.join
end
# ─────────────────────────────────────────────────────────────────────────────

puts "Connecting to Contentful (space: #{SPACE_ID})..."

client = Contentful::Client.new(
  space:        SPACE_ID,
  access_token: ACCESS_TOKEN,
  dynamic_entries: :auto
)

FileUtils.mkdir_p(OUTPUT_DIR)

puts "Fetching horses for '#{STABLE_NAME}'..."

entries = client.entries(content_type: 'horse', include: 2)
puts "Total horse entries found: #{entries.total}"

count = 0

entries.each do |entry|
  # Filter by stable
  home = entry.fields[:home]
  unless home
    puts "  Skipping #{entry.fields[:name]} — no 'home' set"
    next
  end
  home_name = home.respond_to?(:fields) ? home.fields[:name] : nil
  unless home_name == STABLE_NAME
    puts "  Skipping #{entry.fields[:name]} — home is '#{home_name}'"
    next
  end

  name = entry.fields[:name]
  slug = entry.fields[:slug]&.strip
  slug ||= name.downcase
               .gsub(/[äå]/, 'a')
               .gsub(/ö/, 'o')
               .gsub(/\s+/, '-')
               .gsub(/[^a-z0-9\-]/, '')
  filename = File.join(OUTPUT_DIR, "#{slug}.md")

  # Profile image data (URL + metadata)
  profile_image = nil
  if entry.fields[:profile_image]
    asset = entry.fields[:profile_image]
    url = asset.respond_to?(:url) ? asset.url : asset.fields&.dig(:file, :url)
    if url
      profile_image = {
        'url' => "https:#{url}",
        'title' => asset.fields[:title],
        'description' => asset.fields[:description]
      }
    end
  end

  # Gallery data (URLs + metadata)
  gallery = []
  if entry.fields[:gallery]
    entry.fields[:gallery].each do |asset|
      url = asset.respond_to?(:url) ? asset.url : asset.fields&.dig(:file, :url)
      if url
        gallery << {
          'url' => "https:#{url}",
          'title' => asset.fields[:title],
          'description' => asset.fields[:description]
        }
      end
    end
  end

  # Description (RichText → HTML) — goes into markdown body
  description_html = ''
  raw_desc = entry.raw['fields']['description']
  description_html = rt_to_html(raw_desc) if raw_desc

  # Short description (RichText → HTML) — stored in frontmatter
  short_description_html = ''
  raw_short = entry.raw['fields']['shortDescription']
  short_description_html = rt_to_html(raw_short) if raw_short

  # Birthday (Date field) — SDK returns DateTime object
  birthday_str = nil
  if entry.fields[:birthday]
    bd = entry.fields[:birthday]
    birthday_str = bd.respond_to?(:strftime) ? bd.strftime('%d.%m.%Y') : bd.to_s
  end

  # Owner, Breeder and Tuoja from Pedigree API
  api_url = "https://sg-visu.vercel.app/api/horses/pedigree?name=#{slug}"
  api_data = nil
  begin
    uri = URI(api_url)
    response = Net::HTTP.get(uri)
    api_data = JSON.parse(response) if response && !response.strip.empty?
  rescue => e
    puts "  Warning: Could not fetch Pedigree API data for #{name}: #{e.message}"
  end

  # Helper to format user info from API
  def format_api_user(user_data)
    return nil unless user_data && user_data['username']
    name = user_data['username']
    vrl = user_data['vrl_id']
    vrl && !vrl.empty? ? "#{name} (#{vrl})" : name
  end

  owner = entry.fields[:ownername]
  breeder = entry.fields[:breedername]
  tuoja = nil

  if api_data && api_data['horse']
    horse_api = api_data['horse']
    owner_api = format_api_user(horse_api['owner'])
    owner = owner_api if owner_api

    breeder_api = format_api_user(horse_api['breeder'])
    breeder = breeder_api if breeder_api

    tuoja = format_api_user(horse_api['created_by'])
  end

  # Contentful Fallbacks (if API didn't provide them)
  if entry.fields[:owner]
    ref = entry.fields[:owner]
    owner ||= ref.respond_to?(:fields) ? ref.fields[:name] : nil
  end

  if entry.fields[:breeder]
    ref = entry.fields[:breeder]
    breeder ||= ref.respond_to?(:fields) ? ref.fields[:name] : nil
  end

  # Build frontmatter as YAML-safe strings
  frontmatter_lines = [
    "layout: horse",
    "title: #{name.inspect}",
    "name: #{name.inspect}",
  ]
  frontmatter_lines << "shortname: #{entry.fields[:shortname].inspect}"           if entry.fields[:shortname]
   
   if entry.fields[:gender]
     gender_en = entry.fields[:gender].to_s.downcase
     gender_fi = GENDER_MAP[gender_en] || gender_en
     frontmatter_lines << "gender: #{gender_fi.inspect}"
   end
   
   frontmatter_lines << "breed: #{entry.fields[:breed].inspect}"                   if entry.fields[:breed]
  frontmatter_lines << "color: #{entry.fields[:color].inspect}"                   if entry.fields[:color]
  frontmatter_lines << "height: #{entry.fields[:withers_height]}"                 if entry.fields[:withers_height]
  frontmatter_lines << "birthday: #{birthday_str.inspect}"                        if birthday_str
  frontmatter_lines << "dateOfBirth: #{entry.fields[:date_of_birth].inspect}"     if entry.fields[:date_of_birth]
  frontmatter_lines << "disciplines: #{entry.fields[:disciplines].inspect}"       if entry.fields[:disciplines]
  frontmatter_lines << "disciplineLevels: #{entry.fields[:discipline_levels].inspect}" if entry.fields[:discipline_levels]
  frontmatter_lines << "registerId: #{entry.fields[:register_id].inspect}"        if entry.fields[:register_id]
  frontmatter_lines << "owner: #{owner.inspect}"                                  if owner
  frontmatter_lines << "breeder: #{breeder.inspect}"                              if breeder
  frontmatter_lines << "tuoja: #{tuoja.inspect}"                                  if tuoja
  if profile_image
    frontmatter_lines << "profile_image:"
    frontmatter_lines << "  url: #{profile_image['url'].inspect}"
    frontmatter_lines << "  title: #{profile_image['title'].inspect}"             if profile_image['title']
    frontmatter_lines << "  description: #{profile_image['description'].inspect}" if profile_image['description']
  end

  unless gallery.empty?
    frontmatter_lines << "gallery:"
    gallery.each do |item|
      frontmatter_lines << "  - url: #{item['url'].inspect}"
      frontmatter_lines << "    title: #{item['title'].inspect}"             if item['title']
      frontmatter_lines << "    description: #{item['description'].inspect}" if item['description']
    end
  end
  # Short description as YAML literal block scalar
  unless short_description_html.strip.empty?
    frontmatter_lines << "short_description: |"
    short_description_html.each_line { |l| frontmatter_lines << "  #{l.rstrip}" }
  end

  File.open(filename, 'w:UTF-8') do |f|
    f.puts '---'
    frontmatter_lines.each { |l| f.puts l }
    f.puts '---'
    f.puts ''
    f.puts description_html unless description_html.strip.empty?
  end

  puts "✓ #{filename}"
  count += 1
end

puts "\nDone! Generated #{count} horse profile(s) in '#{OUTPUT_DIR}/'."
