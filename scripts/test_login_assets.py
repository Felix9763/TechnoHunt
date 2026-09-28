import urllib.request
import re
import time

time.sleep(2)
try:
    with urllib.request.urlopen('http://localhost:3000/login') as res:
        print('Login Page HTTP status:', res.status)
        html = res.read().decode('utf-8')
        print('HTML length:', len(html))
        
        css_links = re.findall(r'href="(/_next/static/css/[^"]+)"', html)
        print('Found CSS links:', css_links)
        for link in css_links:
            with urllib.request.urlopen(f'http://localhost:3000{link}') as css_res:
                content = css_res.read()
                print(f'CSS {link}: HTTP {css_res.status}, size {len(content)} bytes')
                
        js_scripts = re.findall(r'src="(/_next/static/chunks/[^"]+)"', html)
        print('Found JS scripts count:', len(js_scripts))
        for script in js_scripts[:3]:
            with urllib.request.urlopen(f'http://localhost:3000{script}') as js_res:
                print(f'JS {script}: HTTP {js_res.status}')
except Exception as e:
    print('Error testing login:', e)
