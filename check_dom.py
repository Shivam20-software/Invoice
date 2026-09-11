from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)
driver.get('http://localhost:5000/')

html = driver.execute_script("return document.getElementById('line-items-container').innerHTML;")
print('line-items-container HTML length:', len(html))
print('HTML preview:', repr(html[:150]))

driver.quit()
