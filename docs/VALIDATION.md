# Validação do HardTuna

## Testes automatizados

```bash
npm ci
npm test
npm run build:pages
```

A suíte possui 19 testes, com cenários de:

- Seis cordas, desvios de ±20 cents, decaimento e silêncio a 44,1/48/96 kHz.
- Limites de frequência, incluindo exatamente 60 Hz e rejeição de um pico ainda crescente a 59 Hz.
- Segundo harmônico dominante, fundamental fraca, contexto manual com desafinação e oitavas realmente distintas.
- Ruído determinístico com periodicidade insuficiente.
- Leitura anterior sem validade atual, candidatos rejeitados e troca de nota por tempo decorrido.
- Escolha automática com confirmação temporal e frequências distantes.
- Confirmação por 700 ms de leitura válida, incluindo frequência exatamente constante.
- Permissão tardia, inicialização concorrente, falha de criação/retomada do contexto e rejeição ao fechá-lo.
- Cancelamento durante retomada, remoção de listeners, encerramento de track e suspensão do contexto.
- Armazenamento local indisponível e limites de preferências salvas.

O erro ficou abaixo de um cent nos sinais sintéticos testados. Esses sinais não comprovam a mesma precisão em gravações, instrumentos ou dispositivos reais.

## Benchmark

```bash
npm run benchmark
```

Após aquecimento e 1000 detecções por taxa de amostragem, o ambiente de implementação registrou:

| Amostragem | Tempo por detecção | Janela de captura |
| --- | --- | --- |
| 44,1 kHz | 0,318 ms | 92,9 ms |
| 48 kHz | 0,326 ms | 85,3 ms |
| 96 kHz | 0,363 ms | 42,7 ms |

Isso mede somente o detector em Node. A análise pode esperar cerca de 50 ms, e mediana, confirmação de troca e mola acrescentam atraso. A latência completa e o consumo em celular ainda precisam de medição própria.

## Roteiro com instrumento e navegador

1. Ative o microfone e aguarde um segundo em silêncio. Toque cada corda em Auto e Manual.
2. Confira o comportamento ao parar o som: a leitura anterior pode permanecer atenuada, mas não deve continuar confirmando afinação.
3. Sustente uma corda afinada por 700 ms e confira a marcação. Altere A4 ou reinicie e confira a limpeza.
4. Ajuste sensibilidade e A4, recarregue e confira a persistência.
5. Desligue/religue, cancele uma permissão pendente e alterne de aba. A captura deve encerrar e permitir reconectar.
6. Teste ruído ambiente, instrumento distante, som saturado e troca rápida de corda. Recalibre em silêncio se necessário.
7. Navegue por teclado e ative movimento reduzido. Confira estados, marcações e foco com leitor de tela.
8. No Pages, confira o carregamento do favicon, scripts e estilos em `/hardtuna/`, além da permissão de microfone em HTTPS.

A validação física, gravações representativas, medições em celular e testes com leitor de tela permanecem pendentes até serem executados e registrados.
