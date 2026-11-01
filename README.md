<p align="center">
  <img src="docs/assets/hardtuna-logo.svg" width="560" alt="HardTuna — afinador de violão" />
</p>

<p align="center">
  <strong>Toque uma corda. Encontre a nota. Afine no navegador.</strong>
</p>

<p align="center">
  <a href="https://github.com/amonn3/hardtuna/actions/workflows/pages.yml"><img src="https://github.com/amonn3/hardtuna/actions/workflows/pages.yml/badge.svg?branch=main" alt="Testes e deploy" /></a>
  <a href="https://amonn3.github.io/hardtuna/"><img src="https://img.shields.io/badge/abrir-HardTuna-5ef2c0?logo=githubpages&logoColor=white" alt="Abrir HardTuna" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licen%C3%A7a-MIT-4f7cff" alt="Licença MIT" /></a>
  <img src="https://img.shields.io/badge/React-TypeScript-3178c6?logo=typescript&logoColor=white" alt="React e TypeScript" />
</p>

---

HardTuna é um afinador de violão que roda no navegador. Você abre a página, permite o microfone e toca uma corda. Sem instalar um aplicativo, criar uma conta ou conectar o instrumento a uma interface de áudio.

Ele foi feito para uma tarefa: ajudar a encontrar a afinação padrão **E A D G B E**, com uma leitura fácil de acompanhar. O microfone é processado no seu dispositivo; o aplicativo não grava nem envia seu áudio. A referência A4 e a sensibilidade ficam salvas no próprio navegador, quando o armazenamento está disponível.

## O que faz

- **Reconhece a corda automaticamente.** Uma margem de troca e uma breve confirmação reduzem as mudanças de corda causadas por leituras instáveis.
- **Permite escolher a corda.** Clique em uma das seis cordas para usar o modo manual, inclusive quando a nota estiver distante da afinação esperada.
- **Mostra quanto falta.** O ponteiro indica o desvio em cents, junto da frequência medida e da orientação para subir ou descer a afinação.
- **Marca o progresso.** Uma corda recebe ✓ após 700 ms de leituras válidas dentro de ±3 cents. Você pode reiniciar as marcações a qualquer momento.
- **Ajusta a referência.** A4 pode variar entre 430 e 450 Hz; a preferência é preservada entre visitas.
- **Ajuda a entender o sinal.** Calibração de ruído, sensibilidade ajustável e avisos de som pouco definido ou saturado ajudam a posicionar o instrumento.
- **Cuida do microfone.** Cancelar a ativação libera os recursos; interrupções permitem reconectar. Ocultar a aba encerra a captura.
- **Respeita o jeito de navegar.** Controles com estados acessíveis, navegação por teclado e ponteiro compatível com a preferência de movimento reduzido.

## Use agora

**[Abrir HardTuna →](https://amonn3.github.io/hardtuna/)**

1. Clique em **Ativar microfone** e permita o acesso no navegador.
2. Aguarde um segundo em silêncio para medir o ruído ambiente.
3. Toque uma corda por vez e deixe o som sustentar.
4. Ajuste a tarraxa aos poucos, acompanhando o ponteiro. Se a corda não for reconhecida, selecione-a no modo manual.

A versão pública acompanha a `main`: uma atualização só aparece após a conclusão do workflow de deploy.

Use um navegador com captura de áudio e Web Audio. O microfone precisa de **HTTPS** ou `localhost`. Ao voltar de outra aba, ative-o novamente.

## Como funciona

```text
Microfone do dispositivo
          │
          ▼
Filtros de áudio ──► Detector de frequência ──► Estabilização ──► Ponteiro
          │                                      │
          └── ruído e nível do sinal              └── corda e confirmação

                   Tudo acontece no navegador
```

A captura desliga os filtros de chamada de voz, que podem alterar o som do instrumento. O detector usa o **McLeod Pitch Method**, com autocorrelação por FFT e interpolação dos picos. A evidência do sinal e o contexto da nota ajudam a reduzir erros de oitava, sem simplesmente forçar a frequência esperada.

A análise é limitada a 20 leituras por segundo. A estabilização usa tempo decorrido, e o ponteiro deixa de animar quando chega ao repouso. Uma leitura anterior pode continuar visível por até 1,2 segundo, atenuada, mas deixa de contar como sinal válido assim que não há observação aceita.

Mais detalhes sobre janelas, limiares e organização do código: [arquitetura](docs/ARCHITECTURE.md).

## Rodar localmente

Você precisa de **Node.js 22** e npm. A versão está em [`.nvmrc`](.nvmrc).

```bash
git clone https://github.com/amonn3/hardtuna.git
cd hardtuna
npm ci
npm run dev
```

Abra **http://localhost:5173**. Não é necessário configurar servidor de aplicação, banco de dados ou chave de API.

```bash
npm test              # testes de regressão
npm run build         # build para hospedagem na raiz
npm run preview       # prévia desse build
npm run benchmark     # medição local do detector
```

## Publicação no GitHub Pages

O [workflow de Pages](.github/workflows/pages.yml) instala as dependências, roda os testes e gera o site. PRs executam a validação; mudanças na `main` também publicam o resultado. O deploy usa o ambiente `github-pages` e o endereço **https://amonn3.github.io/hardtuna/**.

O build público usa a base `/hardtuna/`, incluindo scripts, estilos e favicon. Para conferir esse mesmo caminho antes de publicar:

```bash
npm run build:pages
npm run preview:pages
```

Abra **http://localhost:4173/hardtuna/**. A publicação precisa estar configurada em **Settings → Pages → Source → GitHub Actions**. Depois da primeira integração, o workflow também pode ser executado manualmente em **Actions → GitHub Pages → Run workflow**, escolhendo a `main`.

## Limites conhecidos

- **Afinação padrão de seis cordas.** Não há seleção de afinações alternativas nesta versão.
- **Uma corda por vez.** Acordes, ruído e harmônicos podem confundir o detector. A proteção contra oitavas reduz casos conhecidos, mas não elimina todos eles.
- **Precisão sintética não é precisão garantida.** Nos sinais testados, o erro ficou abaixo de um cent. Microfone, ambiente e instrumento real ainda exigem validação própria.
- **Sensibilidade depende do ambiente.** Faça a calibração em silêncio e repita se o ruído mudar. Os limiares ainda precisam ser avaliados com gravações e dispositivos representativos.
- **O benchmark mede só o detector.** Cerca de 0,32–0,36 ms por leitura em Node neste ambiente; isso não mede latência completa nem desempenho em celular.
- **Não há instalação offline.** As fontes são do sistema e o áudio é local, mas o acesso inicial depende da hospedagem. Não há service worker nesta versão.
- **Validação assistiva pendente.** Os estados e o foco foram implementados; a experiência com leitores de tela reais ainda precisa ser verificada.

Os cenários automatizados e o roteiro de teste com instrumento estão em [validação](docs/VALIDATION.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Arquitetura](docs/ARCHITECTURE.md) | Captura, detector, estabilização e interface |
| [Validação](docs/VALIDATION.md) | Testes, benchmark e roteiro com microfone real |
| [Melhorias](melhorias.md) | Revisão inicial, correções e medições ainda pendentes |
| [Workflow](.github/workflows/pages.yml) | Validação dos PRs e publicação no Pages |

## Contribuindo

[Issues](https://github.com/amonn3/hardtuna/issues) e pull requests são bem-vindos. Para relatar uma leitura incorreta, informe navegador, dispositivo, corda, modo e o comportamento observado. Evite incluir gravações privadas sem necessidade.

Antes de enviar uma mudança, execute `npm test` e `npm run build:pages`. Mudanças no processamento de áudio devem incluir um caso de regressão que reproduza o problema. Separe alterações independentes em commits pequenos.

## Autor e licença

Criado por **[amonn3](https://github.com/amonn3)**. HardTuna™.

**[MIT](LICENSE)** — você pode usar, modificar e distribuir o código, inclusive comercialmente, preservando os avisos de autoria e licença. O software é fornecido sem garantia.
