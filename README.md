# Videojuego — Plataforma 2D

Prototipo de un **plataformas 2D** hecho con **HTML5, JavaScript y Canvas puro**, sin librerías ni imágenes externas (todo se dibuja con código).

---

## 🎮 Jugar en línea

👉 **[Jugar ahora](https://cristop1109.github.io/Videojuego---Plataforma/)**

> Si el enlace no carga, es posible que GitHub Pages aún se esté publicando. Entra a **Settings → Pages** del repositorio para ver el estado.

---

## ✨ Características

- Movimiento con aceleración y fricción
- **Salto variable**: cuanto más mantengas la tecla, más alto saltas
- **Coyote time** y **jump buffer** (saltos que perdonan errores humanos)
- **Dash** con enfriamiento e invulnerabilidad durante el impulso
- **Ataque cuerpo a cuerpo** y **disparo** con **pistola** y **rifle**
- Colisiones **AABB** resueltas por ejes
- Enemigos de 4 tipos: **patrulla**, **volador**, **saltador** y **torreta** que dispara
- Se puede **pisar** o **golpear/disparar** a los enemigos; los que tienen más vida muestran barra
- **3 niveles de dificultad** seleccionables desde un menú:
  - **Fácil** — escenario corto y enemigos débiles
  - **Medio** — enemigos más fuertes y un **minijefe**
  - **Difícil** — todos los enemigos mejorados y un **jefe final** con abanico de disparos
- Barra de vida de **jefe/minijefe** en pantalla
- En el nivel difícil el jefe **bloquea la meta** hasta derrotarlo
- **Economía persistente** (`localStorage`): las monedas guardadas no se pierden al recargar
- **Tienda** con **mejoras**, **armas** y **cosméticos**
  - Mejoras: más vida, velocidad, salto, imán de monedas, chaleco y doble salto
  - Armas: Pistola (+20% daño, -10% CD) y Rifle (+50% daño, -20% CD) — puedes cambiar entre ellas si tienes ambas
  - Cosméticos: bufanda cian, casco dorado, visor verde
- **Doble salto**, escudo y bufanda con física simulada
- **Game feel**: sacudida de cámara, hit-stop, knockback de enemigos, squash/stretch
- Partículas (polvo, chispas, estela), números flotantes y cámara con sacudida
- Pozos mortales, cámara que sigue al jugador y fondo con **parallax** y biomas por nivel
- Pantallas de menú, derrota y victoria

---

## 🎮 Controles

| Acción | Teclas |
|---|---|
| Elegir nivel / comprar | `↑` `↓` y `Enter` |
| Moverse | `←` `→` o `A` / `D` |
| Saltar (2 veces = doble salto) | `Espacio` o `W` / `↑` |
| Dash | `Shift` o `L` |
| Atacar/Disparar | `J` o `X` |
| Abrir la tienda | `K` |
| Cambiar arma (si tienes ambas) | `Q` |
| Menú de niveles | `M` (al ganar o perder) |
| Reintentar el nivel | `Enter` (al ganar o perder) |

**Objetivo:** elige una dificultad, llega a la bandera del final sin caer a los pozos, derrota a los enemigos (y al jefe) y gasta las monedas que recojas en la tienda.

---

## 💻 Cómo ejecutarlo localmente

No necesitas instalar nada:

1. Descarga el repositorio (**Code → Download ZIP**).
2. Descomprime y abre el archivo **`index.html`** con doble clic.
3. El juego arranca en tu navegador.

---

## 📁 Estructura del proyecto

```
Videojuego---Plataforma/
├─ index.html    → página que carga el juego
├─ style.css     → marco y estilo de la página
└─ game.js       → toda la lógica (física, colisiones, dibujo)
```

---

## 🛠️ Tecnologías

- **HTML5** (`<canvas>`)
- **JavaScript** (vanilla, sin frameworks)
- **CSS3**

---

## 🚀 Próximos pasos (roadmap)

- [x] Doble salto
- [x] Dash (impulso horizontal)
- [x] Monedas, tienda y economía persistente
- [x] Enemigos con comportamientos distintos
- [x] 3 niveles de dificultad (fácil / medio / difícil)
- [x] Minijefe y jefe final
- [ ] Sistema de "recuerdos" que desbloqueen habilidades (base para un metroidvania de venganza con temática yakuza)
- [ ] Música y efectos de sonido

---

## 📜 Licencia

MIT. Puedes copiarlo, modificarlo y usarlo como base para tus propios proyectos.

---

Creado como primer proyecto de programación de videojuegos. 🎮
