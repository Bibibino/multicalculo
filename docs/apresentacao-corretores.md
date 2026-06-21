# Proposta de MVP — Multicálculo de Seguro Viagem

## Objetivo

A ideia do projeto é reduzir o trabalho repetitivo de cotar seguro viagem em vários portais.

Hoje, o corretor normalmente precisa preencher os mesmos dados de viagem e passageiros em diferentes
seguradoras para comparar preço, coberturas e condições. O MVP propõe uma tela única onde o operador
informa os dados uma vez, seleciona as seguradoras desejadas e acompanha as cotações em paralelo.

O sistema não emite apólice, não realiza pagamento e não fecha contratação automaticamente. Ele serve
para apoiar a comparação e manter histórico do processo.

## O que o protótipo já demonstra

O protótipo atual já possui uma versão funcional com seguradoras simuladas.

Ele permite:

- entrar no sistema com usuário de operador;
- criar uma solicitação de cotação de seguro viagem;
- informar origem, destino, datas e passageiros;
- selecionar três seguradoras simuladas;
- acompanhar o status de cada seguradora separadamente;
- visualizar planos normalizados em uma tabela comparativa;
- exportar os resultados em JSON e CSV;
- cancelar uma cotação;
- repetir uma seguradora que tenha falhado;
- registrar estados e resultados no banco de dados.

As seguradoras atuais são mocks: `carrier-a`, `carrier-b` e `carrier-c`. Elas não acessam sites reais.
O objetivo é demonstrar o fluxo, a arquitetura e a experiência de uso antes de conectar portais reais.

## O que ainda não está conectado

Ainda não há integração com portais reais de seguradoras.

Também ainda não há:

- uso de credenciais reais;
- acesso a sites de seguradoras;
- preenchimento real de formulários externos;
- resolução de CAPTCHA;
- MFA real;
- emissão de apólice;
- contratação;
- pagamento.

Esses pontos dependem de autorização, validação dos termos de uso e definição conjunta com a corretora.

## Como funcionaria com seguradoras reais

Depois de definidas as seguradoras, cada uma terá um “adapter”.

Na prática, esse adapter será responsável por:

- abrir o portal autorizado da seguradora;
- fazer login quando necessário;
- preencher os dados da viagem;
- preencher dados mínimos dos passageiros;
- iniciar a cotação;
- ler os planos disponíveis;
- transformar o resultado em um formato comum;
- registrar erro quando o portal mudar ou bloquear a automação;
- pedir intervenção humana quando houver CAPTCHA, MFA ou etapa manual.

Cada seguradora fica isolada. Se uma falhar, as outras podem continuar normalmente.

## Pontos importantes de segurança e conformidade

O projeto foi desenhado para respeitar controles dos portais.

Regras do MVP:

- não burlar CAPTCHA;
- não burlar MFA;
- não contornar bloqueios ou limites de acesso;
- não simular identidade diferente;
- não executar compra automaticamente;
- não salvar senha em texto puro;
- não armazenar CPF, passaporte ou nome completo no MVP, salvo se uma seguradora realmente exigir e isso for aprovado;
- registrar evidências técnicas sanitizadas quando houver falha;
- permitir intervenção humana quando o portal solicitar.

Se uma seguradora exigir dados sensíveis adicionais, isso deve ser discutido antes de implementar.

## O que precisamos decidir com os corretores

Para transformar o protótipo em multicálculo real, precisamos levantar:

1. Quais três seguradoras entram primeiro.
2. Se a corretora tem autorização para usar automação nesses portais.
3. Se existe ambiente de teste ou homologação.
4. Como é o login em cada portal.
5. Se existe MFA, CAPTCHA ou certificado digital.
6. Quais dados são obrigatórios para uma cotação simples.
7. Se o portal exige CPF, nome, telefone, passaporte ou outros dados pessoais.
8. Quais destinos e faixas etárias são aceitos.
9. Como os resultados aparecem no portal.
10. Se há limites de volume, horários ou concorrência.
11. Quem será responsável por resolver intervenções humanas.
12. Qual é o nível de auditoria esperado.

## Próximo passo sugerido

Antes de integrar qualquer seguradora real, o ideal é fazer uma fase de descoberta controlada.

Para cada seguradora candidata, documentar:

- endereço do portal;
- condições de acesso;
- fluxo de login;
- campos obrigatórios;
- etapas até chegar nos resultados;
- exemplos de planos retornados;
- situações de erro;
- presença de CAPTCHA ou MFA;
- termos ou restrições relevantes;
- decisão: viável agora, viável depois ou não recomendada.

Com isso, escolhemos a primeira seguradora real para implementação de baixo risco.

## Valor esperado

Quando o MVP estiver conectado aos portais autorizados, o corretor poderá:

- cadastrar uma viagem uma única vez;
- consultar múltiplas seguradoras;
- acompanhar cada execução separadamente;
- comparar planos de forma padronizada;
- saber quais seguradoras falharam e por quê;
- repetir uma cotação específica;
- exportar resultados;
- manter histórico e evidências do processo.

O objetivo não é substituir o corretor. O objetivo é tirar trabalho repetitivo, reduzir erro operacional
e dar mais velocidade na comparação.

## Demonstração atual

A demonstração atual deve ser apresentada como protótipo funcional com dados simulados.

Ela serve para validar:

- fluxo de uso;
- campos necessários;
- formato da comparação;
- estados de execução;
- exportação;
- operação básica do sistema;
- clareza para o corretor.

Ela ainda não deve ser apresentada como integração pronta com seguradoras reais.
