# RPG Grid Map — Versão mobile

Esta versão corrige o problema do celular: o painel de configurações fica fechado por padrão em telas pequenas e abre por um botão flutuante.

## Regras implementadas

- Distância com diagonal = 1.41
- 1 subquadrado = 5 pés
- Aéreo: cada 5 pés = 6 horas
- Aquático: cada 5 pés = 9 horas
- Terrestre: cada 5 pés = 12 horas

## Arquivos

Copie estes arquivos para dentro do seu projeto Vite `rpg-grid-map`:

- `src/App.jsx`
- `src/App.css`
- `src/index.css`
- `public/mapa-coordenado.jpg`

## Rodar localmente

```bash
cd /home/Maia/rpg-grid-map
npm install leaflet react-leaflet
npm run dev
```

## Atualizar no GitHub/Vercel depois de copiar

```bash
git add .
git commit -m "Corrige layout mobile"
git push
```
