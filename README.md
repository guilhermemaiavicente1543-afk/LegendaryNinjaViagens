# RPG Grid Map — Sistema de Viagem

Este pacote adiciona cálculo de tempo de viagem por meio de locomoção.

## Regras implementadas

- Distância com diagonal = 1.41
- 1 subquadrado = 5 pés
- Aéreo: cada 5 pés = 6 horas
- Aquático: cada 5 pés = 9 horas
- Terrestre: cada 5 pés = 12 horas

## Dimensões detectadas

- Largura: 1080px
- Altura: 903px
- Arquivo usado pelo app: `public/mapa-coordenado.jpg`

## Sistema de coordenadas

- Colunas grandes: A-J
- Linhas grandes: 1-10
- Cada bloco grande tem 5 x 5 subquadrados
- Formato da coordenada: `C4-3,2`

## Substituir no projeto

Copie estes arquivos para dentro do seu projeto Vite `rpg-grid-map`:

- `src/App.jsx`
- `src/App.css`
- `src/index.css`
- `public/mapa-coordenado.jpg`

## Rodar

Dentro da pasta do projeto:

```bash
cd /home/Maia/rpg-grid-map
npm install leaflet react-leaflet
npm run dev
```

Depois abra:

```text
http://localhost:5173/
```
