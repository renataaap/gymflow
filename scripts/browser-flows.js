import { chromium } from "playwright";
import assert from "node:assert/strict";
const suffix = Date.now().toString(),
  base = process.env.GYMFLOW_TEST_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const dialog = () => page.getByRole("dialog");
const fill = async (values) => {
  for (const [name, value] of Object.entries(values))
    await dialog().locator(`[name="${name}"]`).fill(value);
};
const submit = async (label) => {
  await dialog().getByRole("button", { name: label, exact: true }).click();
  await dialog().waitFor({ state: "detached" });
};
try {
  await page.goto(base);
  await page
    .getByRole("button", { name: "Administrador", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Sua academia, em movimento." })
    .waitFor();
  const nav = page.locator(".sidebar");
  await nav.getByRole("button", { name: "Professores", exact: true }).click();
  await page
    .getByRole("button", { name: "Novo professor", exact: true })
    .click();
  await fill({
    name: "Professor GUI " + suffix,
    email: `prof${suffix}@gymflow.demo`,
    phone: "",
    password: "SenhaTeste12345!",
    specialty: "Força",
    registration: "DEMO-GUI",
  });
  await submit("Salvar");
  await nav.getByRole("button", { name: "Alunos", exact: true }).click();
  await page.getByRole("button", { name: "Novo aluno", exact: true }).click();
  await fill({
    name: "Aluno GUI " + suffix,
    email: `aluno${suffix}@gymflow.demo`,
    phone: "",
    password: "SenhaTeste12345!",
    birthday: "2000-01-01",
    objective: "Força com acompanhamento",
  });
  await dialog()
    .locator('[name="teacher_id"]')
    .selectOption({ label: "Rafael Costa" });
  await dialog().locator('[name="consent"]').check();
  await submit("Salvar");
  await page
    .getByRole("textbox", { name: "Buscar registros" })
    .fill("Aluno GUI " + suffix);
  await page.getByRole("button", { name: "Ver perfil", exact: true }).click();
  await page
    .getByRole("button", { name: "Vincular plano", exact: true })
    .click();
  await dialog().locator('[name="plan_id"]').selectOption({ index: 1 });
  await submit("Vincular e gerar cobrança");
  await page
    .getByRole("button", { name: "Financeiro", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await dialog().locator('[name="method"]').selectOption("Dinheiro");
  await submit("Salvar");
  await page.locator(".badge").filter({ hasText: "Pago" }).waitFor();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("button", { name: "Professor", exact: true }).click();
  await page.getByRole("heading", { name: /Vamos evoluir juntos/ }).waitFor();
  await page
    .getByRole("button", { name: "Criar ficha de treino", exact: true })
    .click();
  await dialog()
    .locator('[name="student_id"]')
    .selectOption({ label: "Aluno GUI " + suffix });
  await fill({ name: "Treino GUI " + suffix, objective: "Condicionamento" });
  await dialog()
    .getByRole("combobox", { name: "Selecionar exercício" })
    .selectOption({ index: 1 });
  await dialog()
    .getByRole("button", { name: "Adicionar", exact: true })
    .click();
  await submit("Salvar ficha");
  await nav
    .getByRole("button", { name: "Avaliações físicas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nova avaliação", exact: true })
    .click();
  await dialog()
    .locator('[name="student_id"]')
    .selectOption({ label: "Aluno GUI " + suffix });
  await fill({
    weight: "75",
    height: "170",
    waist: "80",
    objective: "Força e condicionamento",
    notes: "Acompanhamento fictício.",
  });
  await submit("Salvar");
  await nav.getByRole("button", { name: "Treinos", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar registros" })
    .fill("Treino GUI " + suffix);
  await page.getByRole("button", { name: "Editar ficha", exact: true }).click();
  await fill({ name: "Treino GUI revisado " + suffix });
  await dialog().locator('[name="load"]').fill("25");
  await submit("Salvar ficha");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.locator('form [name="email"]').fill(`aluno${suffix}@gymflow.demo`);
  await page.locator('form [name="password"]').fill("SenhaTeste12345!");
  await page
    .getByRole("button", { name: "Entrar na minha conta", exact: false })
    .click();
  await page.getByRole("heading", { name: /Seu próximo passo/ }).waitFor();
  await page
    .getByRole("button", { name: "Fazer check-in", exact: true })
    .click();
  await submit("Registrar presença");
  await page
    .getByRole("button", { name: "Fazer check-in", exact: true })
    .click();
  await dialog()
    .getByRole("button", { name: "Registrar presença", exact: true })
    .click();
  await dialog()
    .getByRole("alert")
    .filter({ hasText: /já foi registrado/ })
    .waitFor();
  await dialog().getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Iniciar treino", exact: true })
    .click();
  await dialog().locator('[name="load"]').fill("30");
  await dialog().getByRole("checkbox", { name: "Realizado" }).check();
  await submit("Concluir treino");
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Treinos", exact: true })
    .click();
  await page.getByRole("button", { name: "Abrir ficha", exact: true }).click();
  await dialog()
    .locator("summary")
    .filter({ hasText: "1 versões anteriores" })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      adminRegistrationSubscriptionPayment: true,
      teacherWorkoutAssessmentRevision: true,
      studentCheckinExecution: true,
      versionHistory: true,
      javascriptErrors: errors,
    }),
  );
} finally {
  await browser.close();
}
