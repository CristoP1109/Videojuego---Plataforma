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
- Colisiones **AABB** resueltas por ejes
- Enemigos que patrullan y se pueden **pisar** para eliminarlos
- 3 corazones de vida, invulnerabilidad breve tras recibir daño
- Pozos mortales, cámara que sigue al jugador y fondo con **parallax**
- Pantallas de inicio, derrota y victoria

---

## 🎮 Controles

| Acción | Teclas |
|---|---|
| Moverse | `←` `→` o `A` / `D` |
| Saltar | `Espacio` o `W` / `↑` |
| Reiniciar | `Enter` |

**Objetivo:** llega a la bandera roja del final sin caer a los pozos y elimina a los enemigos que encuentres.

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

- [ ] Doble salto
- [ ] Dash (impulso horizontal)
- [ ] Monedas y contador de puntos
- [ ] Más niveles y enemigos con comportamientos distintos
- [ ] Sistema de "recuerdos" que desbloqueen habilidades (base para un metroidvania de venganza con temática yakuza)
- [ ] Música y efectos de sonido

---

## 📜 Licencia

MIT. Puedes copiarlo, modificarlo y usarlo como base para tus propios proyectos.

---

Creado como primer proyecto de programación de videojuegos. 🎮
