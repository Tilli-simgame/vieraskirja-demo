---
layout: default
title: Tallin hevoset
theme: horses
---

# Tallin hevoset

Tallin omat hevoset, joita käytetään ratsastuskoulun tunneilla ja kilpailuissa.

<hr>

{% if site.hevoset.size > 0 %}
{% assign sorted_horses = site.hevoset | sort: "name" %}
{% for horse in sorted_horses %}
[{{ horse.name }}{% if horse.shortname %} “{{ horse.shortname }}”{% endif %}]({{ horse.url | relative_url }}): {{ horse.breed | downcase }}-{{ horse.gender }}{% if horse.height %}, {{ horse.height | floor }}cm{% endif %}<br />
"{{ horse.short_description | strip_html | strip }}"

<hr>
{% endfor %}
{% else %}
*(Hevostietoja ladataan...)*
{% endif %}
