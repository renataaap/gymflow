import { chromium } from "playwright";
import fs from "node:fs/promises";
const base = process.env.GYMFLOW_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await fs.mkdir("work/react-qa", { recursive: true });
try {
  await page.goto(base);
  await page
    .getByRole("button", { name: "Administrador", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Sua academia, em movimento." })
    .waitFor();
  await page.screenshot({
    path: "work/react-qa/dashboard.png",
    fullPage: true,
    animations: "disabled",
  });
  const sidebar = page.locator(".sidebar");
  for (const name of [
    "Alunos",
    "Professores",
    "Treinos",
    "Exercícios",
    "Avaliações físicas",
    "Frequência",
    "Planos",
    "Financeiro",
    "Relatórios",
    "Configurações",
  ]) {
    await sidebar.getByRole("button", { name, exact: true }).click();
    await page.locator(".page-heading h1").waitFor();
  }
  await sidebar.getByRole("button", { name: "Alunos", exact: true }).click();
  await page.getByRole("button", { name: "Novo aluno", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({
    path: "work/react-qa/student-form.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Início", exact: true })
    .click();
  await page.screenshot({
    path: "work/react-qa/admin-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Transbordamento horizontal no dashboard administrativo.");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("button", { name: "Professor", exact: true }).click();
  await page.getByRole("heading", { name: /Vamos evoluir juntos/ }).waitFor();
  await page.screenshot({
    path: "work/react-qa/teacher-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("button", { name: "Aluno", exact: true }).click();
  await page.getByRole("heading", { name: /Seu próximo passo/ }).waitFor();
  await page.screenshot({
    path: "work/react-qa/student-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Transbordamento horizontal no dashboard do aluno.");
  await page
    .getByRole("button", { name: "Iniciar treino", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await page.clock.install();
  const first = dialog.locator('.exercise-run').first();
  await first.getByRole('spinbutton', {name: /Carga realizada/}).fill('42');
  await first.getByRole('checkbox', {name: 'Realizado'}).check();
  if (!await first.evaluate(el => el.classList.contains('completed'))) throw Error('Exercício sem destaque');
  await dialog.getByRole('button', {name: /^Descansar/}).first().click();
  await dialog.getByRole('button', {name: 'Pausar', exact: true}).click();
  const paused = await dialog.getByRole('timer').innerText();
  await page.clock.fastForward(2000);
  if (await dialog.getByRole('timer').innerText() !== paused) throw Error('Pausa falhou');
  await dialog.getByRole('button', {name: 'Continuar', exact: true}).click();
  await page.clock.fastForward(3600000);
  if (await dialog.getByRole('timer').innerText() !== '00:00') throw Error('Descanso não terminou');
  await dialog.getByRole('button', {name: /^Descansar/}).first().click();
  if (!await dialog.getByRole('button', {name: 'Pausar', exact: true}).isEnabled()) throw Error('Reinício falhou');
  await dialog.getByRole('button', {name: 'Continuar depois'}).click();
  await page.getByRole('button', {name: 'Iniciar treino', exact: true}).click();
  dialog = page.getByRole('dialog');
  await dialog.getByText('Rascunho retomado:', {exact: false}).waitFor();
  if (await dialog.locator('.exercise-run').first().getByRole('spinbutton', {name: /Carga realizada/}).inputValue() !== '42') throw Error('Rascunho perdido');
  if (await dialog.getByRole('timer').count()) throw Error('Cronômetro não foi limpo');
  await page.clock.resume();
  for (const row of await dialog.locator(".exercise-run").all()) {
    await row.getByRole("spinbutton", { name: /Carga realizada/ }).fill("25");
    await row.getByRole("checkbox", { name: "Realizado" }).check();
  }
  await page.screenshot({
    path: "work/react-qa/training.png",
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: "Concluir treino", exact: true })
    .click();
  await dialog.waitFor({ state: "detached" });
  // Use the responsive menu to inspect the persisted session.
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await sidebar
    .getByRole("button", { name: "Histórico de treinos", exact: true })
    .click();
  await page.locator("table tbody tr").first().waitFor();
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      javascriptErrors: errors,
      desktop: true,
      mobile: true,
      studentExecutionSaved: true,
    }),
  );
} finally {
  await browser.close();
}
