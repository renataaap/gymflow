from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os
ROOT=Path(__file__).resolve().parents[1]/'work'
ROOT.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(os.environ.get('GYMFLOW_TEST_URL','http://127.0.0.1:8000'));page.wait_for_selector('[data-action="demo-admin"]')
    page.screenshot(path=str(ROOT/'login.png'),full_page=True,animations="disabled")
    page.click('[data-action="demo-admin"]');page.wait_for_selector('h1:has-text("Sua academia")')
    page.screenshot(path=str(ROOT/'dashboard-desktop.png'),full_page=True,animations="disabled")
    for route in ['students','teachers','workouts','exercises','assessments','attendance','plans','payments','reports','settings','profile']:
        page.evaluate(f"navigate('{route}')")
        page.wait_for_timeout(50)
        if route in ['students','plans']:page.screenshot(path=str(ROOT/(route+'.png')),full_page=True,animations="disabled")
    for action in ['new-student','new-teacher','new-workout','new-exercise','new-assessment','new-plan','subscribe','new-payment','new-attendance']:
        page.evaluate(f"document.dispatchEvent(new CustomEvent('qa'))")
        page.evaluate(f"document.getElementById('content').insertAdjacentHTML('beforeend','<button id=qa-button data-action={action}>QA</button>')")
        page.click('#qa-button');page.wait_for_selector('[role="dialog"]');
        if action=='new-workout':
            page.select_option('#exercise-picker','1');page.click('[data-action="add-exercise"]');page.locator('#builder-rows [name="load"]').fill('30');page.screenshot(path=str(ROOT/'workout-builder.png'),full_page=True,animations="disabled")
        page.click('[data-action="close-modal"]');page.locator('#qa-button').evaluate('(el)=>el.remove()')
    # Mobile: independent layout and real navigation.
    page.set_viewport_size({'width':390,'height':844});page.evaluate("navigate('dashboard')");page.screenshot(path=str(ROOT/'dashboard-mobile.png'),full_page=True,animations="disabled")
    mobile_overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
    page.click('[data-action="logout"]');page.wait_for_selector('[data-action="demo-teacher"]');page.click('[data-action="demo-teacher"]');page.wait_for_selector('h1:has-text("Vamos evoluir")');page.screenshot(path=str(ROOT/'teacher-mobile.png'),full_page=True,animations="disabled")
    page.click('[data-action="logout"]');page.wait_for_selector('[data-action="demo-student"]');page.click('[data-action="demo-student"]');page.wait_for_selector('h1:has-text("Seu próximo passo")');page.screenshot(path=str(ROOT/'student-mobile.png'),full_page=True,animations="disabled")
    student_overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
    page.click('[data-action="start-workout"]');page.wait_for_selector('#run-rows');page.screenshot(path=str(ROOT/'training-mobile.png'),full_page=True,animations="disabled")
    for row in page.locator('.exercise-run').all():row.locator('[type="checkbox"]').check()
    page.locator('#modal-form [type="submit"]').click();page.wait_for_selector('.modal-backdrop',state='detached');page.evaluate("navigate('history')");page.wait_for_selector('table tbody tr')
    print(json.dumps({'javascript_errors':errors,'admin_mobile_overflow':mobile_overflow,'student_mobile_overflow':student_overflow,'student_training_saved':True,'screenshots':list(x.name for x in ROOT.glob('*.png'))},ensure_ascii=False))
    browser.close()
