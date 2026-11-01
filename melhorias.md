# Melhorias do HardTuna

Registro da revisão de código realizada em 31/10/2026. Implementação registrada nesta branch; testes locais automatizados concluídos e validação com instrumento real pendente.

## Objetivo

Priorizar a confiabilidade da leitura, a resposta ao tocar ou trocar de corda e o gerenciamento do microfone. Preservar a arquitetura pequena e a separação atual entre áudio, regras musicais e interface.

## Validação inicial

- `npm run build` passou.
- Detector exercitado com sinais sintéticos em 44,1, 48 e 96 kHz.
- Nas seis frequências da afinação padrão, com senoides puras, o erro ficou abaixo de 0,003 cent.
- Tempo médio de detecção no ambiente local: aproximadamente 0,32 ms, após aquecimento, com janela de 4096 amostras. Não representa desempenho em celular.
- Não houve teste com microfone real. Os resultados sintéticos não garantem precisão em instrumentos, ambientes e dispositivos reais.

## Prioridade alta

### 1. Corrigir inicialização e liberação do microfone

- **Problema:** stream e contexto só são registrados nas refs após `await ctx.resume()`. Uma falha anterior pode deixar recursos locais fora do alcance da limpeza. Parar ou desmontar durante a solicitação de permissão também não invalida a inicialização pendente.
- **Proposta:** registrar recursos assim que forem criados, identificar cada sessão de inicialização e liberar recursos de sessões canceladas. Evitar inicializações concorrentes e tratar falhas no fechamento do contexto.
- **Validar:** permissão concedida após desmontagem, falha ao criar/retomar contexto, chamadas concorrentes e ciclos de ligar/desligar.
- **Código:** `src/audio/useTuner.ts:59`.
- [x] Implementado e coberto por testes sintéticos ou de lógica; validação física pendente.

### 2. Proteger contra erros de oitava

- **Problema reproduzido:** sinal com fundamental de 82,41 Hz, segundo harmônico dominante e terceiro fraco foi detectado como 164,99 Hz, com clareza de aproximadamente 0,98. O limiar atual aceita essa leitura; o automático associa essa frequência a D3.
- **Proposta:** avaliar candidatos de oitava usando continuidade temporal e, no manual, a corda selecionada como contexto. Permitir desafinação real, sem forçar a frequência esperada.
- **Validar:** diferentes proporções de harmônicos, fundamental fraca, notas realmente separadas por oitava e troca de cordas.
- **Código:** `src/audio/pitchDetector.ts:107`, `src/tuning.ts:29`.
- [x] Implementado e coberto por testes sintéticos ou de lógica; validação física pendente.

### 3. Separar leitura anterior de sinal válido atual

- **Problema:** a frequência permanece por 1,2 segundo após o sinal desaparecer e `hasSignal` continua verdadeiro. A interface pode continuar mostrando “Afinado!”. Candidatos de nova nota rejeitados também renovam `lastVoiced` usando o histórico antigo.
- **Proposta:** expor frequência, confiança e instante da última leitura aceita separadamente. Manter a leitura anterior visível com aparência própria, sem usá-la para confirmar afinação. Atualizar a validade somente quando uma observação for aceita.
- **Código:** `src/audio/useTuner.ts:110`, `src/App.tsx:44`.
- [x] Implementado e coberto por testes sintéticos ou de lógica; validação física pendente.

### 4. Confirmar afinação por tempo de sinal válido

- **Problema:** a confirmação de 700 ms depende da reexecução de um efeito por mudanças de valores. Uma leitura exatamente estável não provoca nova verificação apenas pela passagem do tempo. O contador não é explicitamente reiniciado ao mudar A4; as marcações persistem entre ciclos do microfone.
- **Proposta:** exigir 700 ms de leituras válidas consecutivas. Reiniciar a confirmação ao perder o sinal ou alterar a referência e definir a duração de uma sessão de afinação. Oferecer ação para reiniciar as marcações.
- **Código:** `src/App.tsx:63`.
- [x] Implementado e coberto por testes sintéticos ou de lógica; validação física pendente.

### 5. Desvincular estabilização da taxa da tela

- **Problema:** mediana de cinco leituras, três candidatos e suavização com alpha fixo dependem de frames. Telas de 60 e 120 Hz produzem respostas diferentes. Janelas consecutivas são bastante sobrepostas.
- **Proposta:** controlar a cadência de análise e calcular suavização e confirmação por tempo decorrido. Medir o atraso total entre captura, estabilização e movimento do ponteiro.
- **Código:** `src/audio/useTuner.ts:102`.
- **Referência:** [MDN — requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
- [x] Implementado e coberto por testes sintéticos ou de lógica; validação física pendente.

## Prioridade média

### 6. Estabilizar a escolha automática da corda

- **Problema:** `nearestString()` sempre retorna uma corda, mesmo para 1.000 Hz, e troca imediatamente ao cruzar o ponto intermediário entre duas cordas.
- **Proposta:** adicionar margem para troca, confirmação temporal e estado de frequência distante das cordas esperadas. Rever a orientação “aperte bastante”, pois uma identificação incorreta pode produzir uma instrução inadequada.
- **Código:** `src/tuning.ts:29`, `src/App.tsx:94`.
- [x] Implementado e coberto por testes sintéticos ou de lógica; validação física pendente.

### 7. Calibrar sensibilidade e diagnosticar o sinal

- **Problema:** gate RMS de 0,006 e clareza mínima de 0,88 são fixos, independentemente do microfone, distância e ambiente.
- **Proposta:** medir ruído ambiente e oferecer sensibilidade ajustável. Distinguir sinal fraco, periodicidade insuficiente e saturação. Ajustar limiares a partir de medições e gravações representativas.
- **Código:** `src/audio/useTuner.ts:9`.
- [x] Implementado e coberto por testes sintéticos ou de lógica; validação física pendente.

### 8. Reduzir processamento e atualizações contínuas da interface

- **Problema:** o detector roda em cada frame com sinal e atualiza a frequência no estado React. O Gauge mantém outro loop, inclusive parado e atrás da tela inicial.
- **Proposta:** limitar atualizações numéricas, evitar renders desnecessários e interromper a animação quando a mola estabilizar. Medir em celular antes de decidir mover o processamento para outra thread.
- **Código:** `src/audio/useTuner.ts:136`, `src/components/Gauge.tsx:41`.
- [x] Análise limitada a 20 Hz; mola para ao estabilizar; benchmark reproduzível incluído.
- [ ] Medir desempenho e latência total em celular.

### 9. Tratar interrupções de captura

- **Problema:** não há tratamento de término da track ou mudança de estado do AudioContext. A interface pode continuar em `listening` após uma interrupção.
- **Proposta:** observar eventos da track e do contexto, refletir interrupções na interface e permitir reconexão. Definir comportamento ao ocultar a aba ou suspender o dispositivo.
- **Código:** `src/audio/useTuner.ts:75`.
- **Referência:** [MDN — MediaStreamTrack ended](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/ended_event).
- [x] Implementado e coberto por testes sintéticos ou de lógica; validação física pendente.

### 10. Criar testes de regressão do processamento de áudio

- **Problema:** não há suíte de testes. Um sinal de exatamente 60 Hz retorna `null`, embora 60 Hz seja o mínimo configurado: o pico no limite é excluído.
- **Proposta:** cobrir as seis cordas com desvios conhecidos, harmônicos dominantes, ruído, decaimento, limites de frequência, troca de nota e taxas de amostragem distintas. Incluir testes da estabilização e do ciclo de captura.
- **Código:** `src/audio/pitchDetector.ts:104`, `package.json:6`.
- [x] Suíte reproduzível e correção do limite inferior.

### 11. Completar acessibilidade e redução de movimento

- **Problema:** Auto/Manual não expõem estado pressionado; a marca de corda afinada fica oculta para leitores de tela; o overlay permite foco nos controles atrás dele. A preferência de movimento reduzido só desliga animações CSS, não a mola JavaScript.
- **Proposta:** expor os estados de modo e afinação, gerenciar foco e interação do overlay e respeitar movimento reduzido no Gauge.
- **Código:** `src/App.tsx:179`, `src/components/StringSelector.tsx:34`, `src/styles.css:477`, `src/components/Gauge.tsx:41`.
- [x] Estados acessíveis, foco contido, conteúdo atrás da tela de ativação inerte e movimento reduzido.
- [ ] Validar com teclado e leitor de tela reais.

## Manutenção e uso pessoal

### 12. Consolidar regras e melhorar conveniência

- Centralizar a tolerância de ±3 cents, duplicada em App e Gauge.
- Extrair a estabilização do hook para lógica testável sem captura de áudio ou React.
- Qualificar no README as afirmações sobre evitar erros de oitava e precisão abaixo de um cent, indicando condições de teste.
- Salvar A4 e sensibilidade localmente.
- Adicionar ação “reiniciar afinação”.
- Avaliar funcionamento offline e fontes locais; atualmente as fontes são carregadas do Google Fonts.
- **Código:** `src/App.tsx:14`, `src/components/Gauge.tsx:17`, `README.md:18`, `index.html:9`.
- [x] Consolidar regras e documentação.
- [x] Implementar preferências e reinício.
- [x] Avaliar suporte offline: removidas fontes remotas; cache offline adiado até definir estratégia de atualização.

## Ordem sugerida de execução

1. Adicionar testes dos cenários críticos do item 10 junto das correções.
2. Corrigir ciclo do microfone, validade do sinal e confirmação de afinação: itens 1, 3 e 4.
3. Melhorar oitavas, cadência e escolha automática: itens 2, 5 e 6.
4. Calibrar com gravações e dispositivos reais: itens 7 e 9.
5. Medir desempenho em celular e aplicar otimizações: item 8.
6. Completar acessibilidade, manutenção e conveniência: itens 11 e 12.

As referências de linha correspondem à revisão inicial e podem mudar durante a implementação.

## Resultado da implementação

- `npm test`: 19 testes passando; `npm run build`: passou.
- `npm run benchmark`: 0,318/0,326/0,363 ms por detecção a 44,1/48/96 kHz neste ambiente Node.
- O contexto de oitava exige ganho de periodicidade, preservando oitavas reais e desafinação nos casos sintéticos.
- Leitura aceita expõe frequência, confiança, instante e validade separados; candidatos rejeitados não renovam validade.
- A captura usa identificador de sessão, libera permissões tardias e observa término de tracks e suspensão do contexto.
- Sensibilidade ajustável, calibração por mediana do ruído de um segundo e diagnóstico de saturação implementados.
- Uma sessão dura da ativação ao encerramento do microfone, inclusive ao ocultar a aba. A4 e reinício limpam marcações.
- Pendências empíricas: calibração com gravações representativas, instrumento/microfone reais, latência em celular e leitor de tela.
- Servidor local para validação antes de publicar a branch e abrir o PR, conforme solicitado.

As propostas originais foram mantidas como histórico. Os critérios numéricos atuais estão descritos no README e nos testes.
