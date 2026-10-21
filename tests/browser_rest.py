"""Verifica descanso e retomada do treino em uma base demo descartável."""
import os
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.environ.get('GYMFLOW_TEST_URL', 'http://127.0.0.1:8000'))
    page.click('[data-action="demo-student"]')
    page.click('[data-action="start-workout"]')
    page.locator('.exercise-run').first.locator('[name="load"]').fill('42')
    page.locator('.exercise-run').first.locator('[type="checkbox"]').check()
    assert page.locator('.exercise-run').first.evaluate("el => el.classList.contains('completed')")
    page.locator('[data-action="rest-start"]').first.click()
    assert page.locator('#rest-panel').is_visible()
    page.click('#rest-pause')
    paused = page.locator('#rest-time').inner_text()
    page.wait_for_timeout(1100)
    assert page.locator('#rest-time').inner_text() == paused
    page.click('#rest-pause')
    page.evaluate('restDeadline=Date.now()-1000;renderRestTimer()')
    assert page.locator('#rest-time').inner_text() == '00:00'
    assert page.locator('#rest-pause').is_disabled()
    assert 'concluído' in page.locator('#rest-status').inner_text()
    page.locator('[data-action="rest-start"]').first.click()
    assert page.locator('#rest-pause').is_enabled()
    page.click('[data-action="close-modal"]')
    assert page.evaluate('restInterval===null')
    page.click('[data-action="start-workout"]')
    assert page.locator('.draft-notice').is_visible()
    assert page.locator('.exercise-run').first.locator('[name="load"]').input_value() == '42'
    assert page.locator('.exercise-run').first.locator('[type="checkbox"]').is_checked()
    assert not page.locator('#rest-panel').is_visible()
    page.locator('[data-action="rest-start"]').first.click()
    assert page.locator('#modal-form').evaluate('el => el.scrollWidth <= el.clientWidth')
    assert not errors, errors
    browser.close()
    print('Descanso, pausa, conclusão, reinício, limpeza e retomada mobile: OK')
