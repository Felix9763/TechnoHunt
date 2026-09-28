import urllib.request
import re

with urllib.request.urlopen('http://localhost:3000/login') as res:
    html = res.read().decode('utf-8')

css_match = re.search(r'href="(/_next/static/css/[^"]+)"', html)
if css_match:
    css_url = f'http://localhost:3000{css_match.group(1)}'
    with urllib.request.urlopen(css_url) as res_css:
        css = res_css.read().decode('utf-8')
    print('CSS loaded successfully, length:', len(css))
    
    for token in ['--color-paper', '--color-ink', 'news-card', 'bg-paper', 'text-ink', 'newspaper-quote']:
        print(f'{token} found in CSS: {token in css}')
else:
    print('No CSS link found in HTML!')
