'use strict';
// Gopher Laberinto · juego de laberinto para la semana 11 de POO (interfaces en Go).
// En cada nivel el gopher recoge las fichas de código que cumplen el contrato y esquiva las trampas mientras los
// bugs lo persiguen. El contenido sale de datos.js (generado y comprobado con Go por _fuente/construir.py) y va
// cifrado en cadena: cada nivel se abre con la llave que deja el anterior terminado.

const J = window.JUEGO;
const CLAVE = 'gopher-laberinto-interfaces-v1';
let MAPA = null, K0 = '', E = null;

/* ---------------- estado guardado ---------------- */
// k: llave de cada nivel alcanzado · hecho: niveles terminados · trampas: trampas comidas en el primer recorrido
// de cada nivel (el informe) · puntos: mejor puntaje de cada nivel
const nuevo = (nombre = '', apellido = '') => ({ nombre, apellido, k: { 0: K0 }, hecho: {}, trampas: {}, puntos: {} });
function cargar() {
  try { return { ...nuevo(), ...JSON.parse(localStorage.getItem(CLAVE)) }; } catch { return nuevo(); }
}
const guardar = () => localStorage.setItem(CLAVE, JSON.stringify(E));
const nivelHecho = n => !!E.hecho[n];
const nivelAbierto = n => n === 0 || nivelHecho(n - 1);
const todoHecho = () => MAPA.niveles.every((_, n) => nivelHecho(n));
const comidas = n => (E.trampas[n] || []).length;
const esquivadas = n => MAPA.niveles[n].trampas - comidas(n);
const totalTrampas = () => MAPA.niveles.reduce((s, x) => s + x.trampas, 0);
const totalEsquivadas = () => MAPA.niveles.reduce((s, _, n) => s + esquivadas(n), 0);
const puntosTotal = () => Object.values(E.puntos).reduce((s, p) => s + p, 0);
const estrellas = n => comidas(n) === 0 ? 3 : comidas(n) === 1 ? 2 : 1;

/* ---------------- utilidades ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KW = /^(type|struct|interface|func|var|return|package|import|for|range|if|else|map|nil|true|false)$/;
const TIPO = /^(string|int|bool|float64|error|any)$/;
function resaltar(src) {
  return src.replace(/(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|([A-Za-z_]\w*)|(\d+(?:\.\d+)?)|([\s\S])/g, (m, c, s, w, num) => {
    if (c) return `<span class="c">${esc(c)}</span>`;
    if (s) return `<span class="s">${esc(s)}</span>`;
    if (w) return KW.test(w) ? `<span class="k">${w}</span>` : TIPO.test(w) ? `<span class="t">${w}</span>` : w;
    if (num) return `<span class="n">${num}</span>`;
    return esc(m);
  });
}
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);
function nombreBonito(s) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase().split(' ')
    .map((p, i) => i > 0 && PARTICULAS.has(p) ? p : p.replace(/(^|['-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()))
    .join(' ');
}
const abrirCon = async (dato, ...partes) => Cifra.abrir(await Cifra.llave(...partes), dato);
const estrellasHTML = k => `<span class="estrellas">${[0, 1, 2].map(i => `<span class="${i < k ? 'on' : ''}">${ICONO.estrella}</span>`).join('')}</span>`;
const CORAZON = ic('<path d="M12 20.5 4.2 12.9A4.9 4.9 0 0 1 11.1 6l.9.9.9-.9a4.9 4.9 0 0 1 6.9 6.9z" fill="currentColor"/>');
const MASCOTA = { ojos: 'arriba', cejas: 'decidido' };
function confeti() {
  const c = document.createElement('div'); c.className = 'confeti';
  const colores = ['#EAAA00', '#FFFFFF', '#910048', '#6AD7E5', '#1E9E5A'];
  c.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${colores[Math.floor(Math.random() * colores.length)]};animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * .8}s"></i>`).join('');
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 5000);
}

function pintar(html, clase = '') {
  parar();
  const quien = E.nombre ? `<div class="jugador"><b>${esc(E.nombre)} ${esc(E.apellido)}</b>${Object.keys(E.hecho).length} de ${MAPA.niveles.length} niveles · ${puntosTotal()} pts</div>` : '';
  document.body.innerHTML = `<header class="top"><div class="logo">${gopherSvg(MASCOTA)}<span>Gopher <b>Laberinto</b></span></div><div class="der">${quien}</div></header>
    <main id="app" class="${clase}">${html}</main>`;
  window.scrollTo({ top: 0 });
}

/* ---------------- inicio ---------------- */
function inicio() {
  const chips = ['interface', 'firma', 'sin implements', 'polimorfismo', '*receptor', 'Stringer', 'error'].map(c => `<span class="chip oscuro">${c}</span>`).join('');
  const registro = E.nombre
    ? `<h2>Hola de nuevo, ${esc(E.nombre)}</h2><p class="suave">Llevas ${Object.keys(E.hecho).length} de ${MAPA.niveles.length} niveles.</p>
       <div class="fila-btn"><button class="btn grande" id="seguir">Seguir jugando ${ICONO.sig}</button></div>
       <div class="fila-btn"><button class="btn sec" id="otro">Soy otra persona / empezar de nuevo</button></div>`
    : `<h2>Registro</h2><p class="suave">Escribe tu nombre y tu apellido: aparecerán en tu certificado.</p>
       <label for="nom">Nombre</label><input type="text" id="nom" autocomplete="given-name" maxlength="30">
       <label for="ape">Apellido</label><input type="text" id="ape" autocomplete="family-name" maxlength="30">
       <p class="aviso" id="aviso"></p>
       <button class="btn grande" id="empezar">Empezar ${ICONO.sig}</button>`;
  pintar(`<section class="portada">${gopherSvg({ ojos: 'arriba', boca: 'abierta', cejas: 'decidido' })}
      <h1>Gopher <b>Laberinto</b></h1>
      <p>Interfaces en Go</p>
      <div class="chips-niveles">${chips}</div></section>
    <div class="card">${registro}</div>
    <div class="card"><h2>${ICONO.mapa} Cómo se juega</h2>
      <p>Cada nivel trae un <b>contrato</b> (una interfaz) y fichas de código con letras. Recoge <b>solo las que encajan</b>: si comes una trampa pierdes una vida y ves el error real que da Go.</p>
      <p>Cuatro bugs te persiguen: <b>Nil</b>, <b>Panic</b>, <b>Typo</b> y <b>Loop</b>. Cuando cumples el contrato se asustan, puedes atraparlos, y se abre la <b>salida</b> en el centro.</p>
      <p>Muévete con las <b>flechas</b> o <b>W A S D</b>; en el celular, <b>desliza el dedo</b> sobre el laberinto. Con <b>P</b> pausas. Al final recibes tu informe y tu <b>certificado</b>.</p></div>`);
  if (E.nombre) {
    $('#seguir').onclick = mapa;
    $('#otro').onclick = () => { if (confirm('Se borrará el progreso guardado en este dispositivo. ¿Continuar?')) { E = nuevo(); guardar(); inicio(); } };
    return;
  }
  const valido = s => /^[\p{L}][\p{L}' -]{1,29}$/u.test(s.trim());
  const empezar = () => {
    const n = $('#nom').value, a = $('#ape').value;
    if (!valido(n) || !valido(a)) { $('#aviso').textContent = 'Escribe tu nombre y tu apellido (solo letras).'; return; }
    E = nuevo(nombreBonito(n), nombreBonito(a));
    guardar();
    mapa();
  };
  $('#empezar').onclick = empezar;
  ['#nom', '#ape'].forEach(s => $(s).addEventListener('keydown', e => { if (e.key === 'Enter') empezar(); }));
}

/* ---------------- mapa de niveles ---------------- */
function mapa() {
  const hechos = Object.keys(E.hecho).length, pct = Math.round(hechos / MAPA.niveles.length * 100);
  const nodos = MAPA.niveles.map((nv, n) => {
    const hecho = nivelHecho(n), abierto = nivelAbierto(n);
    const der = hecho ? estrellasHTML(estrellas(n)) : abierto ? `<span class="chip">${ICONO.play} Jugar</span>` : `<span class="suave">${ICONO.candado}</span>`;
    return `<button class="nodo ${hecho ? 'hecho' : abierto ? 'actual' : ''}" data-n="${n}" ${abierto ? '' : 'disabled'}>
      <span class="medalla">${ICONO[nv.icono]}<span class="num">${n + 1}</span></span>
      <span><b>Nivel ${n + 1} · ${esc(nv.titulo)}</b><small>${esc(nv.tema)} · ${nv.trampas} trampas</small></span>${der}</button>`;
  }).join('');
  pintar(`<h2>${ICONO.mapa} Los niveles</h2>
    <div class="progreso"><i style="width:${pct}%"></i></div>
    <div class="mapa">${nodos}</div>
    ${todoHecho() ? `<div class="fila-btn"><button class="btn grande" id="inf">${ICONO.trofeo} Ver mi informe y mi certificado</button></div>` : ''}`);
  $$('.nodo:not(:disabled)').forEach(b => { b.onclick = () => intro(+b.dataset.n); });
  if (todoHecho()) $('#inf').onclick = informe;
}

/* ---------------- intro de un nivel: la idea antes de jugar ---------------- */
const nivelId = n => MAPA.niveles[n].id;
async function intro(n) {
  const cont = await abrirCon(J.niveles[n].c, E.k[n], nivelId(n), 'nivel');
  const repaso = nivelHecho(n);
  pintar(`<div class="cabeza-reto"><button class="btn sec" id="volver">${ICONO.mapa} Mapa</button>
      <span class="chip oscuro">Nivel ${n + 1} · ${esc(cont.titulo)}</span></div>
    <div class="globo">${gopherSvg({ ojos: 'arriba' })}<div class="texto">${cont.intro.map(p => `<p>${p}</p>`).join('')}</div></div>
    <div class="card"><h2>${ICONO.codigo} ${esc(cont.tema)}</h2><pre class="go">${resaltar(cont.codigo)}</pre></div>
    <div class="card"><h2>${ICONO.lupa} Tu misión</h2><p>${cont.mision}</p>
      <p class="suave">Comer una trampa cuesta una vida. Tienes 3 vidas; si las pierdes, el nivel vuelve a empezar.</p>
      ${repaso ? '<p class="suave"><b>Modo repaso:</b> ya terminaste este nivel; tu informe no cambia.</p>' : ''}
      <div class="fila-btn"><button class="btn grande" id="jugar">${ICONO.play} Jugar</button></div></div>`);
  $('#volver').onclick = mapa;
  $('#jugar').onclick = () => jugar(n, cont, repaso);
}

/* ---------------- el laberinto ----------------
   Rejilla de 15 × 17. Las casillas de coordenadas impares son nodos; entre nodos hay pasillo o pared. Se arma
   un árbol (DFS) en la mitad izquierda, se refleja, se quitan los callejones sin salida y se abren unos ciclos
   para poder escapar. Misma semilla, mismo laberinto. */
const ANCHO = 15, ALTO = 17;
const INICIO = [7, 15], SALIDA = [7, 7], CASAS = [[7, 1], [5, 1], [9, 1], [7, 3]];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function rng(a) {
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function laberinto(semilla) {
  const r = rng(semilla), azar = a => a[Math.floor(r() * a.length)];
  const g = Array.from({ length: ALTO }, () => Array(ANCHO).fill(1));
  const abrir = (x, y) => { g[y][x] = 0; g[y][ANCHO - 1 - x] = 0; };
  const enMitad = (x, y) => x >= 1 && x <= 7 && y >= 1 && y <= ALTO - 2;
  const visto = new Set(['7,15']), pila = [[7, 15]];
  abrir(7, 15);
  while (pila.length) {
    const [x, y] = pila[pila.length - 1];
    const vec = DIRS.map(([dx, dy]) => [x + 2 * dx, y + 2 * dy, dx, dy]).filter(([a, b]) => enMitad(a, b) && !visto.has(a + ',' + b));
    if (!vec.length) { pila.pop(); continue; }
    const [a, b, dx, dy] = azar(vec);
    abrir(x + dx, y + dy); abrir(a, b); visto.add(a + ',' + b); pila.push([a, b]);
  }
  const dentro = (x, y) => x >= 1 && x <= ANCHO - 2 && y >= 1 && y <= ALTO - 2;
  for (let y = 1; y < ALTO - 1; y += 2) for (let x = 1; x <= 7; x += 2) {
    if (DIRS.filter(([dx, dy]) => !g[y + dy][x + dx]).length > 1) continue;
    const [dx, dy] = azar(DIRS.filter(([dx, dy]) => g[y + dy][x + dx] && dentro(x + 2 * dx, y + 2 * dy)));
    abrir(x + dx, y + dy);
  }
  for (let i = 0; i < 7; i++) {
    const hor = r() < .5;
    const x = hor ? 2 + 2 * Math.floor(r() * 3) : 1 + 2 * Math.floor(r() * 4);
    const y = hor ? 1 + 2 * Math.floor(r() * 8) : 2 + 2 * Math.floor(r() * 7);
    abrir(x, y);
  }
  return g;
}

/* ---------------- una partida ---------------- */
const BUGS = [
  { nombre: 'Nil', color: '#E8414F' }, { nombre: 'Panic', color: '#E24C9A' },
  { nombre: 'Typo', color: '#F28A2E' }, { nombre: 'Loop', color: '#33C37A' },
];
const COLORES = ['#EAAA00', '#6AD7E5', '#FF8A3D', '#B892FF', '#5BD68A', '#FF7A98'];
const LETRAS = 'ABCDEF';
const VEL_JUG = 5, VEL_MIEDO = 2.4, MIEDO = 7;
let S = null, cv = null, cx = null, TC = 24, DPR = 1, fondo = null, rafId = 0, SPR = {};

function sprites() {
  const mk = op => { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 6 120 130" width="120" height="130">${gopher(op)}</svg>`); return i; };
  SPR = { a: mk({ cejas: 'decidido' }), b: mk({ cejas: 'decidido', boca: 'abierta' }), feliz: mk({ ojos: 'feliz', boca: 'abierta' }), x: mk({ ojos: 'x', boca: 'abierta' }) };
}
const libre = (x, y) => x >= 0 && y >= 0 && x < ANCHO && y < ALTO && !S.g[y][x];
const pos = e => ({ x: e.tx + e.dx * e.p, y: e.ty + e.dy * e.p });
const cerca = e => e.p < .5 ? [e.tx, e.ty] : [e.tx + e.dx, e.ty + e.dy];
const ent = ([x, y]) => ({ tx: x, ty: y, dx: 0, dy: 0, p: 0 });

function jugar(n, cont, repaso) {
  const g = laberinto(cont.semilla);
  const nodos = [];
  for (let y = 1; y < ALTO; y += 2) for (let x = 1; x < ANCHO; x += 2) nodos.push([x, y]);
  const prohibido = [INICIO, SALIDA, ...CASAS];
  const cand = nodos.filter(([x, y]) => Math.abs(x - INICIO[0]) + Math.abs(y - INICIO[1]) >= 5 && !prohibido.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 2))
    .sort(() => Math.random() - .5);
  const fichas = [];
  for (const sep of [5, 4, 3, 2]) {
    for (const [x, y] of cand) {
      if (fichas.length === cont.fichas.length) break;
      if (fichas.every(f => Math.abs(f.x - x) + Math.abs(f.y - y) >= sep) && !fichas.some(f => f.x === x && f.y === y)) fichas.push({ x, y });
    }
  }
  fichas.forEach((f, i) => Object.assign(f, { i, comida: false }));
  const dots = new Set();
  for (let y = 0; y < ALTO; y++) for (let x = 0; x < ANCHO; x++)
    if (!g[y][x] && !prohibido.slice(0, 1).some(([a, b]) => a === x && b === y) && !fichas.some(f => f.x === x && f.y === y)) dots.add(x + ',' + y);
  S = {
    n, cont, repaso, g, fichas, dots, res: {}, okComidas: new Set(), vidas: 3, pts: 0, fase: 'cuenta', tFase: 2.4, miedo: 0,
    largo: '¡Prepárate!', salida: false, reloj: 0, t: 0, jug: { ...ent(INICIO), q: [0, 0], izq: false, muerto: false },
    bugs: BUGS.slice(0, cont.bugs).map((b, i) => ({ ...b, ...ent(CASAS[i]), casa: CASAS[i], k: i, espera: 1.5 + 2.2 * i, miedo: false, meta: SALIDA, tMeta: 0 })),
  };
  pantallaJuego();
  cartel('¡Prepárate!');
}

function pantallaJuego() {
  const { n, cont } = S;
  const lista = cont.fichas.map((txt, i) => `<li class="pieza" id="f${i}"><span class="letra" style="--c:${COLORES[i]}">${LETRAS[i]}</span><pre>${resaltar(txt)}</pre><span class="estado"></span></li>`).join('');
  pintar(`<div class="hud"><button class="btn sec mini" id="salir" aria-label="Volver al mapa">${ICONO.mapa}<span class="solo-pc">Mapa</span></button>
      <span class="chip oscuro">Nivel ${n + 1} · ${esc(cont.titulo)}</span>
      <span class="vidas" id="vidas" aria-label="Vidas"></span><span class="pts" id="pts">0</span>
      <button class="btn sec mini solo-movil" id="vercod" aria-label="Ver el código (pausa)">${ICONO.codigo}</button></div>
    <div class="tablero">
      <div class="arena" id="arena"><canvas id="cv" aria-label="Laberinto: mueve al gopher con las flechas o deslizando el dedo"></canvas><div class="cartel" id="cartel"></div></div>
      <aside class="panel">
        <div class="card mision"><p>${cont.mision}</p><div class="avance" id="avance"></div></div>
        <ul class="piezas" id="piezas">${lista}</ul>
        <div class="card codigo-lado solo-pc"><h3>${ICONO.codigo} El código</h3><pre class="go">${resaltar(cont.base)}</pre></div>
      </aside>
    </div>
    <dialog id="dlg" aria-labelledby="dlg-titulo"><div class="dlg-cuerpo" id="dlgc"></div><div class="dlg-pie"><button class="btn grande" id="dlgok"></button></div></dialog>`, 'juego-main');
  cv = $('#cv'); cx = cv.getContext('2d');
  $('#salir').onclick = () => { if (S.fase === 'fin' || confirm('Si sales ahora, este intento del nivel se pierde. ¿Salir?')) mapa(); };
  $('#vercod').onclick = () => pausa(true);
  hud();
  medir();
  controles();
  let antes = performance.now();
  const bucle = ahora => {
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
    paso(dt); dibujar();
    rafId = requestAnimationFrame(bucle);
  };
  rafId = requestAnimationFrame(bucle);
}
function parar() {
  cancelAnimationFrame(rafId); rafId = 0;
  window.onkeydown = null; window.onresize = null; document.onvisibilitychange = null;
}

function hud() {
  $('#vidas').innerHTML = [0, 1, 2].map(i => `<span class="${i < S.vidas ? '' : 'off'}">${CORAZON}</span>`).join('');
  $('#pts').textContent = S.pts + ' pts';
  $('#avance').textContent = S.salida ? '¡Contrato cumplido! Corre a la salida del centro.' : `Correctas: ${S.okComidas.size} de ${S.cont.nok}`;
  S.fichas.forEach(f => {
    const li = $('#f' + f.i), r = S.res[f.i];
    li.className = 'pieza' + (f.comida ? (r && r.ok ? ' ok' : ' no') : S.salida ? ' fuera' : '');
    li.querySelector('.estado').innerHTML = f.comida ? (r && r.ok ? ICONO.bien : ICONO.cerrar) : '';
  });
}
const cartel = txt => { const c = $('#cartel'); if (c) c.textContent = txt; };

function medir() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const zona = $('#arena'), ancho = window.innerWidth >= 900;
  const disp = zona.parentElement.clientWidth - (ancho ? 332 : 0);
  const panel = ancho ? 0 : $('.panel').offsetHeight;
  const alto = window.innerHeight - (zona.getBoundingClientRect().top + window.scrollY) - panel - 14;
  TC = Math.max(16, Math.floor(Math.min(disp / ANCHO, Math.max(alto, 260) / ALTO)));
  cv.width = ANCHO * TC * DPR; cv.height = ALTO * TC * DPR;
  cv.style.width = ANCHO * TC + 'px'; cv.style.height = ALTO * TC + 'px';
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  pintarFondo();
}

/* ---------------- controles: teclado y deslizar ---------------- */
function dirigir(dx, dy) {
  const j = S.jug;
  j.q = [dx, dy];
  if (j.p > 0 && dx === -j.dx && dy === -j.dy) { j.tx += j.dx; j.ty += j.dy; j.dx = dx; j.dy = dy; j.p = 1 - j.p; }
  if (dx) j.izq = dx < 0;
}
function controles() {
  const TECLAS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1], d: [1, 0], a: [-1, 0], s: [0, 1], w: [0, -1] };
  window.onkeydown = e => {
    if ($('#dlg').open) return;
    const d = TECLAS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (d) { e.preventDefault(); dirigir(...d); }
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') pausa(false);
  };
  let ini = null;
  const zona = $('#arena');
  zona.addEventListener('touchstart', e => { const t = e.touches[0]; ini = [t.clientX, t.clientY]; }, { passive: true });
  zona.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!ini) return;
    const t = e.touches[0], dx = t.clientX - ini[0], dy = t.clientY - ini[1];
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    Math.abs(dx) > Math.abs(dy) ? dirigir(Math.sign(dx), 0) : dirigir(0, Math.sign(dy));
    ini = [t.clientX, t.clientY];
  }, { passive: false });
  zona.addEventListener('touchend', () => { ini = null; });
  window.onresize = () => { if (cv && cv.isConnected) medir(); };
  document.onvisibilitychange = () => { if (document.hidden) pausa(false); };
}

/* ---------------- movimiento ----------------
   Cada personaje sale de la casilla (tx, ty) hacia (tx+dx, ty+dy) y lleva recorrido p (0 a 1). En el centro de
   cada casilla decide hacia dónde sigue. */
function avanzar(e, d, decidir) {
  for (let i = 0; d > 1e-9 && i < 8; i++) {
    if (!e.dx && !e.dy) { decidir(e); if (!e.dx && !e.dy) return; }
    const falta = 1 - e.p;
    if (d < falta) { e.p += d; return; }
    d -= falta; e.tx += e.dx; e.ty += e.dy; e.p = 0;
    decidir(e);
  }
}
function decidirJugador(j) {
  const [qx, qy] = j.q;
  if ((qx || qy) && libre(j.tx + qx, j.ty + qy)) { j.dx = qx; j.dy = qy; }
  else if (!libre(j.tx + j.dx, j.ty + j.dy)) { j.dx = 0; j.dy = 0; }
}
function objetivo(b) {
  const j = S.jug, d = Math.abs(b.tx - j.tx) + Math.abs(b.ty - j.ty);
  if (b.k === 1) return [j.tx + 3 * (j.dx || j.q[0]), j.ty + 3 * (j.dy || j.q[1])];      // Panic se adelanta
  if (b.k === 2 && d > 5) {                                                              // Typo pasea si está lejos
    if (S.reloj > b.tMeta || (b.tx === b.meta[0] && b.ty === b.meta[1])) { b.meta = [1 + 2 * Math.floor(Math.random() * 7), 1 + 2 * Math.floor(Math.random() * 8)]; b.tMeta = S.reloj + 5; }
    return b.meta;
  }
  if (b.k === 3 && d < 6) return [1, ALTO - 2];                                          // Loop se retira si está cerca
  return [j.tx, j.ty];                                                                   // Nil va directo
}
function decidirBug(b) {
  const ops = DIRS.filter(([dx, dy]) => libre(b.tx + dx, b.ty + dy));
  let cand = ops.filter(([dx, dy]) => !(dx === -b.dx && dy === -b.dy && (b.dx || b.dy)));
  if (!cand.length) cand = ops;
  let el;
  if (b.miedo || Math.random() < .12) el = cand[Math.floor(Math.random() * cand.length)];
  else {
    const [gx, gy] = objetivo(b);
    el = cand.reduce((m, c) => (b.tx + c[0] - gx) ** 2 + (b.ty + c[1] - gy) ** 2 < (b.tx + m[0] - gx) ** 2 + (b.ty + m[1] - gy) ** 2 ? c : m);
  }
  [b.dx, b.dy] = el;
}

function paso(dt) {
  if (!S) return;
  S.t += dt;
  if (S.fase === 'cuenta' || S.fase === 'atrapado') {
    S.tFase -= dt;
    if (S.fase === 'cuenta' && S.largo) cartel(S.tFase > 1.6 ? S.largo : S.tFase > .8 ? '2' : '1');
    if (S.tFase <= 0) { if (S.fase === 'atrapado') trasAtrapado(); else { S.fase = 'juego'; cartel(''); } }
    return;
  }
  if (S.fase !== 'juego') return;
  S.reloj += dt;
  if (S.miedo > 0) { S.miedo -= dt; if (S.miedo <= 0) { S.miedo = 0; S.bugs.forEach(b => { b.miedo = false; }); } }
  avanzar(S.jug, VEL_JUG * dt, decidirJugador);
  if (comer()) return;
  for (const b of S.bugs) {
    if (b.espera > 0) { b.espera -= dt; continue; }
    avanzar(b, (b.miedo ? VEL_MIEDO : S.cont.vel) * dt, decidirBug);
  }
  choques();
}

function comer() {
  const [x, y] = cerca(S.jug), k = x + ',' + y;
  if (S.dots.delete(k)) { S.pts += 10; $('#pts').textContent = S.pts + ' pts'; }
  if (S.salida && x === SALIDA[0] && y === SALIDA[1]) { terminar(); return true; }
  const f = S.fichas.find(f => !f.comida && f.x === x && f.y === y);
  if (f && !S.salida) { comerFicha(f); return true; }
  return false;
}
function choques() {
  const p = pos(S.jug);
  for (const b of S.bugs) {
    const q = pos(b);
    if (Math.hypot(p.x - q.x, p.y - q.y) > .62) continue;
    if (b.miedo) {
      S.pts += 200; hud();
      Object.assign(b, ent(b.casa), { miedo: false, espera: 3 });
    } else { atrapado(b); return; }
  }
}
function atrapado(b) {
  S.vidas--; S.fase = 'atrapado'; S.tFase = 1.3; S.jug.muerto = true;
  cartel(`¡Te atrapó ${b.nombre}!`);
  hud();
}
function trasAtrapado() {
  if (S.vidas <= 0) { sinVidas(); return; }
  Object.assign(S.jug, ent(INICIO), { q: [0, 0], muerto: false });
  S.bugs.forEach((b, i) => Object.assign(b, ent(b.casa), { espera: 1 + 1.6 * i, miedo: S.miedo > 0 }));
  cuenta(2.4, '¡Sigue!');
}
function cuenta(seg, largo = '') { S.fase = 'cuenta'; S.tFase = seg; S.largo = largo; if (!largo) cartel(''); }

/* ---------------- fichas, diálogo y fin ---------------- */
function abrirDlg(html, boton, alCerrar) {
  const dlg = $('#dlg');
  $('#dlgc').innerHTML = html;
  $('#dlgok').innerHTML = boton;
  $('#dlgok').onclick = () => dlg.close();
  dlg.onclose = alCerrar;
  dlg.showModal();
  $('#dlgc').scrollTop = 0;
  $('#dlgok').focus();
}
async function comerFicha(f) {
  f.comida = true; S.fase = 'pausa';
  const r = S.res[f.i] || (S.res[f.i] = await abrirCon(J.niveles[S.n].f[f.i], E.k[S.n], nivelId(S.n), f.i, 'ficha'));
  if (r.ok) { S.okComidas.add(f.i); S.pts += 150; }
  else {
    S.vidas--;
    if (!S.repaso) { const t = new Set(E.trampas[S.n] || []); t.add(f.i); E.trampas[S.n] = [...t]; guardar(); }
  }
  hud();
  const txt = S.cont.fichas[f.i];
  const term = r.term ? `<div class="terminal${r.term.tipo === 'error' ? ' mal' : ''}"><div class="term-cab">${ICONO.terminal}<span>${r.term.tipo === 'error' ? 'Con esta ficha, go run . responde:' : 'Con esta ficha, go run . imprime:'}</span></div><pre>${esc(r.term.texto)}</pre></div>` : '';
  abrirDlg(`<div class="retro ${r.ok ? 'ok' : 'no'}">${gopherSvg(r.ok ? { ojos: 'feliz', boca: 'abierta' } : { ojos: 'x', boca: 'abierta' })}
      <div><h3 id="dlg-titulo">${r.ok ? '¡Encaja!' : '¡Trampa! Pierdes una vida'}</h3><p>${r.por}</p></div></div>
    <div class="pieza-dlg"><span class="letra" style="--c:${COLORES[f.i]}">${LETRAS[f.i]}</span><pre class="go">${resaltar(txt)}</pre></div>${term}`,
    S.vidas <= 0 ? 'Continuar' : `Seguir jugando ${ICONO.sig}`,
    () => {
      if (S.vidas <= 0) { sinVidas(); return; }
      if (S.okComidas.size === S.cont.nok) contratoCumplido();
      else cuenta(.5);
    });
}
function contratoCumplido() {
  S.salida = true; S.miedo = MIEDO;
  S.bugs.forEach(b => { b.miedo = true; b.dx = -b.dx; b.dy = -b.dy; if (b.dx || b.dy) { b.tx -= b.dx; b.ty -= b.dy; b.p = 1 - b.p; } });
  S.fase = 'juego';
  cartel('¡Contrato cumplido!');
  setTimeout(() => { if (S && S.salida && S.fase === 'juego') cartel(''); }, 1600);
  hud();
}
function pausa(conCodigo) {
  if (!S || S.fase === 'pausa' || S.fase === 'fin' || $('#dlg').open) return;
  const antes = S.fase === 'atrapado' ? 'atrapado' : 'cuenta';
  S.fase = 'pausa';
  abrirDlg(`<h2 id="dlg-titulo">${ICONO.ayuda} Pausa</h2><p>${S.cont.mision}</p>${conCodigo ? `<pre class="go">${resaltar(S.cont.base)}</pre>` : ''}`,
    `${ICONO.play} Seguir jugando`, () => { if (antes === 'cuenta') cuenta(.5); else S.fase = antes; });
}
function sinVidas() {
  S.fase = 'fin';
  const { n, cont, repaso } = S;
  abrirDlg(`<div class="retro no">${gopherSvg({ ojos: 'x', boca: 'abierta' })}<div><h3 id="dlg-titulo">Te quedaste sin vidas</h3>
      <p>Este intento terminó en <code>panic</code>. Vuelve a empezar el nivel: las fichas cambian de lugar, pero son las mismas.</p></div></div>`,
    `${ICONO.play} Reintentar el nivel`, () => jugar(n, cont, repaso));
}
async function terminar() {
  S.fase = 'fin';
  const { n, cont, repaso } = S;
  const sig = await Cifra.huella(E.k[n], nivelId(n), 'ok', ...[...S.okComidas].sort((a, b) => a - b));
  const total = S.pts + 300 + 100 * S.vidas;
  E.hecho[n] = true; E.k[n + 1] = sig; E.puntos[n] = Math.max(E.puntos[n] || 0, total);
  guardar();
  finNivel(n, cont, total, repaso);
}
function finNivel(n, cont, total, repaso) {
  const est = estrellas(n), siguiente = n + 1 < MAPA.niveles.length;
  const msj = repaso ? 'Repaso terminado: tu informe no cambia.' : est === 3 ? '¡Nivel perfecto: no comiste ninguna trampa!' : est === 2 ? '¡Muy bien! Solo una trampa.' : 'Repasa los porqués: el siguiente nivel usa lo de este.';
  pintar(`<div class="card fin">${gopherSvg(est >= 2 ? { ojos: 'feliz', boca: 'abierta' } : { ojos: 'normal' })}
      <h2 style="justify-content:center">Nivel ${n + 1} · ${esc(cont.titulo)}</h2>
      ${estrellasHTML(est)}
      <p><b>${esquivadas(n)} de ${MAPA.niveles[n].trampas}</b> trampas esquivadas · <b>${total}</b> puntos · ${msj}</p>
      <div class="terminal"><div class="term-cab">${ICONO.terminal}<span>El programa del nivel compila. go run . imprime:</span></div><pre>${esc(cont.salida)}</pre></div>
      <div class="fila-btn">
        ${siguiente ? `<button class="btn grande" id="sig">Ir al nivel ${n + 2} ${ICONO.sig}</button>` : `<button class="btn grande" id="inf">${ICONO.trofeo} Ver mi informe y mi certificado</button>`}
      </div>
      <div class="fila-btn"><button class="btn sec" id="mapa">${ICONO.mapa} Volver al mapa</button></div></div>`);
  if (est >= 2 && !repaso) confeti();
  $('#mapa').onclick = mapa;
  if (siguiente) $('#sig').onclick = () => intro(n + 1);
  else $('#inf').onclick = informe;
}

/* ---------------- dibujo ---------------- */
function pintarFondo() {
  fondo = document.createElement('canvas'); fondo.width = cv.width; fondo.height = cv.height;
  const x = fondo.getContext('2d'); x.setTransform(DPR, 0, 0, DPR, 0, 0);
  x.fillStyle = '#071a3d'; x.fillRect(0, 0, ANCHO * TC, ALTO * TC);
  const capa = (color, r) => {
    x.fillStyle = color; x.strokeStyle = color; x.lineCap = 'round'; x.lineWidth = 2 * r * TC;
    for (let y = 0; y < ALTO; y++) for (let i = 0; i < ANCHO; i++) {
      if (!S.g[y][i]) continue;
      const a = (i + .5) * TC, b = (y + .5) * TC;
      x.beginPath(); x.arc(a, b, r * TC, 0, 7); x.fill();
      if (i + 1 < ANCHO && S.g[y][i + 1]) { x.beginPath(); x.moveTo(a, b); x.lineTo(a + TC, b); x.stroke(); }
      if (y + 1 < ALTO && S.g[y + 1][i]) { x.beginPath(); x.moveTo(a, b); x.lineTo(a, b + TC); x.stroke(); }
    }
  };
  capa('#123f8f', .4); capa('#2c67cc', .24); capa('rgba(234,170,0,.55)', .045);
}
function caja(x, a, b, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h); }
function dibujar() {
  if (!S || !cx) return;
  const x = cx, t = S.t;
  x.drawImage(fondo, 0, 0, ANCHO * TC, ALTO * TC);
  x.fillStyle = '#f3cf6a';
  for (const k of S.dots) { const [a, b] = k.split(','); x.beginPath(); x.arc((+a + .5) * TC, (+b + .5) * TC, TC * .09, 0, 7); x.fill(); }
  if (S.salida) {
    const a = (SALIDA[0] + .5) * TC, b = (SALIDA[1] + .5) * TC, r = TC * (.42 + .06 * Math.sin(t * 6));
    const gr = x.createRadialGradient(a, b, 0, a, b, r * 1.6); gr.addColorStop(0, 'rgba(234,170,0,.9)'); gr.addColorStop(1, 'rgba(234,170,0,0)');
    x.fillStyle = gr; x.beginPath(); x.arc(a, b, r * 1.6, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = TC * .08; x.beginPath(); x.arc(a, b, r, 0, 7); x.stroke();
    x.fillStyle = '#002C71'; x.font = `800 ${TC * .36}px Poppins, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GO', a, b + 1);
  }
  for (const f of S.fichas) {
    if (f.comida || S.salida) continue;
    const s = TC * .8 * (1 + .06 * Math.sin(t * 4 + f.i)), a = (f.x + .5) * TC, b = (f.y + .5) * TC;
    x.shadowColor = COLORES[f.i]; x.shadowBlur = TC * .45;
    x.fillStyle = COLORES[f.i]; caja(x, a - s / 2, b - s / 2, s, s, s * .28); x.fill();
    x.shadowBlur = 0; x.lineWidth = Math.max(1.5, TC * .06); x.strokeStyle = '#0b1424'; x.stroke();
    x.fillStyle = '#0b1424'; x.font = `800 ${TC * .5}px Poppins, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(LETRAS[f.i], a, b + TC * .03);
  }
  S.bugs.forEach(b => pintarBug(x, b, t));
  const j = S.jug, p = pos(j), s = TC * 1.22, an = (j.dx || j.dy) && S.fase === 'juego';
  const img = j.muerto ? SPR.x : S.miedo > 0 ? SPR.feliz : an && Math.floor(t * 8) % 2 ? SPR.b : SPR.a;
  const bob = an ? Math.sin(t * 16) * TC * .04 : 0;
  x.save(); x.translate((p.x + .5) * TC, (p.y + .5) * TC + bob);
  if (j.izq) x.scale(-1, 1);
  if (img.complete && img.naturalWidth) x.drawImage(img, -s / 2, -s * .56, s, s * 130 / 120);
  x.restore();
}
function pintarBug(x, b, t) {
  const p = pos(b), a = (p.x + .5) * TC, c = (p.y + .5) * TC + (b.espera > 0 ? Math.sin(t * 5 + b.k) * TC * .05 : 0), R = TC * .4;
  const blanco = S.miedo > 0 && S.miedo < 2 && Math.floor(t * 6) % 2;
  const color = b.miedo ? (blanco ? '#ffffff' : '#8fa6cc') : b.color;
  x.strokeStyle = '#0b1424'; x.lineCap = 'round'; x.lineWidth = Math.max(1.4, R * .16);
  const mv = Math.sin(t * 15 + b.k * 2) * R * .2;
  for (const k of [-1, 0, 1]) for (const lado of [-1, 1]) {
    x.beginPath(); x.moveTo(a + lado * R * .45, c + k * R * .38 + R * .1);
    x.lineTo(a + lado * R * 1.02, c + k * R * .55 + R * .1 + (k === 0 ? -mv : mv) * lado); x.stroke();
  }
  x.beginPath(); x.moveTo(a - R * .18, c - R * .8); x.quadraticCurveTo(a - R * .45, c - R * 1.25, a - R * .78, c - R * 1.15);
  x.moveTo(a + R * .18, c - R * .8); x.quadraticCurveTo(a + R * .45, c - R * 1.25, a + R * .78, c - R * 1.15); x.stroke();
  x.fillStyle = '#1b2a3a'; x.beginPath(); x.arc(a, c - R * .6, R * .42, 0, 7); x.fill();
  x.fillStyle = color; x.beginPath(); x.ellipse(a, c + R * .15, R * .78, R * .8, 0, 0, 7); x.fill();
  x.lineWidth = Math.max(1.2, R * .1); x.stroke();
  x.beginPath(); x.moveTo(a, c - R * .5); x.lineTo(a, c + R * .92); x.stroke();
  x.fillStyle = 'rgba(11,20,36,.5)';
  for (const [u, v, r] of [[-.4, .02, .14], [.4, .02, .14], [-.32, .5, .11], [.32, .5, .11]]) { x.beginPath(); x.arc(a + u * R, c + v * R, r * R, 0, 7); x.fill(); }
  const ex = b.miedo ? 0 : b.dx * R * .06, ey = b.miedo ? 0 : b.dy * R * .06;
  for (const lado of [-1, 1]) {
    x.fillStyle = '#fff'; x.beginPath(); x.arc(a + lado * R * .18, c - R * .66, R * .16, 0, 7); x.fill();
    x.fillStyle = '#0b1424'; x.beginPath(); x.arc(a + lado * R * .18 + ex, c - R * .66 + ey, R * (b.miedo ? .05 : .08), 0, 7); x.fill();
  }
}

/* ---------------- informe de entendimiento ---------------- */
const nivelTema = p => p >= 80 ? 'Lo domina' : p >= 50 ? 'En proceso' : 'Debe repasarlo';
const porTema = () => MAPA.niveles.map((nv, n) => ({ tema: nv.tema, bien: esquivadas(n), total: nv.trampas, p: Math.round(esquivadas(n) / nv.trampas * 100) }));
function informe() {
  if (!todoHecho()) { mapa(); return; }
  const temas = porTema(), a = totalEsquivadas(), tot = totalTrampas(), p = Math.round(a / tot * 100);
  pintar(`<div class="card"><h2>${ICONO.informe} Informe de entendimiento</h2>
      <p><b>${esc(E.nombre)} ${esc(E.apellido)}</b> · ${a} de ${tot} trampas esquivadas en el primer recorrido (${p} %) · ${puntosTotal()} puntos</p>
      <div class="temas">${temas.map(x => `<div class="tema"><b>${esc(x.tema)}</b><div class="barra"><i class="${x.p >= 80 ? '' : x.p >= 50 ? 'medio' : 'bajo'}" style="width:${x.p}%"></i></div>
        <span>${x.bien}/${x.total}</span><small>${nivelTema(x.p)}</small></div>`).join('')}</div>
      <div class="fila-btn no-imprimir"><button class="btn grande" id="cert">${ICONO.trofeo} Ver mi certificado</button></div>
      <div class="fila-btn no-imprimir"><button class="btn sec" id="copiar">${ICONO.copiar} Copiar el informe</button>
        <button class="btn sec" id="imprimir">${ICONO.imprimir} Imprimir</button><button class="btn sec" id="mapa">${ICONO.mapa} Mapa</button></div>
      <p class="aviso" id="aviso"></p></div>`);
  $('#cert').onclick = certificado;
  $('#mapa').onclick = mapa;
  $('#imprimir').onclick = () => window.print();
  $('#copiar').onclick = async () => {
    const txt = `Gopher Laberinto · ${E.nombre} ${E.apellido}\n${a} de ${tot} trampas esquivadas (${p} %) · ${puntosTotal()} puntos\n` +
      temas.map(x => `${x.tema}: ${x.bien}/${x.total} · ${nivelTema(x.p)}`).join('\n');
    try { await navigator.clipboard.writeText(txt); $('#aviso').style.color = 'var(--bien)'; $('#aviso').textContent = 'Informe copiado.'; }
    catch { $('#aviso').textContent = 'No se pudo copiar; usa «Imprimir».'; }
  };
}

/* ---------------- certificado ---------------- */
function rango(p) { return p >= 90 ? 'Maestro de interfaces' : p >= 75 ? 'Implementador experto' : p >= 50 ? 'Aprendiz avanzado' : 'Aprendiz de interfaces'; }
function codigo(texto) {
  let h = 0x811c9dc5;
  for (const ch of texto) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  const s = h.toString(36).toUpperCase().padStart(8, '0').slice(-8);
  return s.slice(0, 4) + '-' + s.slice(4);
}
const cargarImg = src => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
async function dibujarCertificado() {
  try { await Promise.all([document.fonts.load('800 60px Poppins'), document.fonts.load('600 30px Poppins'), document.fonts.load('400 28px Poppins')]); } catch { /* fuente del sistema */ }
  const W = 1600, H = 1131, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const AZUL = '#002C71', DORADO = '#EAAA00', MAG = '#910048', GRIS = '#4a5461';
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fbf7ec'; x.fillRect(60, 60, W - 120, H - 120);
  x.strokeStyle = DORADO; x.lineWidth = 16; x.strokeRect(28, 28, W - 56, H - 56);
  x.strokeStyle = AZUL; x.lineWidth = 3; x.strokeRect(60, 60, W - 120, H - 120);
  x.fillStyle = DORADO;
  [[60, 60, 1, 1], [W - 60, 60, -1, 1], [60, H - 60, 1, -1], [W - 60, H - 60, -1, -1]].forEach(([a, b, sx, sy]) => {
    x.beginPath(); x.moveTo(a, b); x.lineTo(a + 84 * sx, b); x.lineTo(a, b + 84 * sy); x.closePath(); x.fill();
  });
  x.textAlign = 'left'; x.font = '800 50px Poppins, sans-serif';
  x.fillStyle = AZUL; x.fillText('Gopher', 130, 150);
  x.fillStyle = DORADO; x.fillText('Laberinto', 130, 206);
  try {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 136" width="240" height="272">${gopher({ ojos: 'feliz', boca: 'abierta' })}</svg>`;
    x.drawImage(await cargarImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)), W - 300, 80, 190, 215);
  } catch { /* sin mascota */ }
  const centro = (txt, y, fuente, color) => { x.font = fuente; x.fillStyle = color; x.textAlign = 'center'; x.fillText(txt, W / 2, y); };
  centro('CERTIFICADO DE LOGRO', 320, '800 66px Poppins, sans-serif', AZUL);
  x.fillStyle = DORADO; x.fillRect(W / 2 - 160, 342, 320, 6);
  centro('Se otorga a', 410, '400 30px Poppins, sans-serif', GRIS);
  const nombre = `${E.nombre} ${E.apellido}`;
  let tam = 78; x.font = `800 ${tam}px Poppins, sans-serif`;
  while (x.measureText(nombre).width > W - 360 && tam > 40) { tam -= 4; x.font = `800 ${tam}px Poppins, sans-serif`; }
  centro(nombre, 498, `800 ${tam}px Poppins, sans-serif`, MAG);
  x.strokeStyle = DORADO; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2 - 420, 528); x.lineTo(W / 2 + 420, 528); x.stroke();
  centro(`por completar los ${MAPA.niveles.length} niveles de interfaces en Go`, 588, '600 30px Poppins, sans-serif', AZUL);
  centro('interface · firma · sin implements · polimorfismo · *receptor · Stringer · error', 634, '600 22px "JetBrains Mono", Consolas, monospace', GRIS);
  const a = totalEsquivadas(), tot = totalTrampas(), p = Math.round(a / tot * 100);
  [[`${a} de ${tot}`, 'trampas esquivadas'], [`${p} %`, 'de logro'], [rango(p), 'nivel alcanzado']].forEach(([v, et], i) => {
    const cxx = W / 2 + (i - 1) * 420, y = 680;
    x.fillStyle = i === 2 ? '#fdf2f7' : '#eef3fb'; x.strokeStyle = i === 2 ? MAG : AZUL; x.lineWidth = 2;
    caja(x, cxx - 190, y, 380, 104, 18); x.fill(); x.stroke();
    x.textAlign = 'center'; x.fillStyle = i === 2 ? MAG : AZUL;
    let t = 40; x.font = `800 ${t}px Poppins, sans-serif`;
    while (x.measureText(v).width > 350 && t > 22) { t -= 2; x.font = `800 ${t}px Poppins, sans-serif`; }
    x.fillText(v, cxx, y + 56);
    x.font = '400 20px Poppins, sans-serif'; x.fillStyle = GRIS; x.fillText(et, cxx, y + 88);
  });
  x.font = '600 17px Poppins, sans-serif';
  porTema().forEach((tm, i) => {
    const col = i % 3, fil = Math.floor(i / 3), px = 150 + col * 440, y = 830 + fil * 46;
    x.textAlign = 'left'; x.fillStyle = AZUL; x.fillText(tm.tema, px, y);
    x.fillStyle = '#e8edf4'; x.fillRect(px, y + 9, 330, 9);
    x.fillStyle = tm.p >= 80 ? '#1E9E5A' : tm.p >= 50 ? DORADO : '#C62839'; x.fillRect(px, y + 9, 330 * tm.p / 100, 9);
    x.fillStyle = GRIS; x.textAlign = 'right'; x.fillText(`${tm.bien}/${tm.total}`, px + 386, y + 18);
  });
  const fecha = new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
  x.textAlign = 'left'; x.fillStyle = GRIS; x.font = '400 22px Poppins, sans-serif';
  x.strokeStyle = DORADO; x.lineWidth = 2; x.beginPath(); x.moveTo(130, 935); x.lineTo(W - 130, 935); x.stroke();
  x.fillText(fecha.charAt(0).toUpperCase() + fecha.slice(1), 130, 985);
  x.font = '400 18px Poppins, sans-serif'; x.fillText('Fecha', 130, 1012);
  x.textAlign = 'right'; x.fillStyle = AZUL; x.font = '600 24px "JetBrains Mono", Consolas, monospace';
  x.fillText(codigo(`${nombre}|${a}|${fecha}`), W - 130, 985);
  x.fillStyle = GRIS; x.font = '400 18px Poppins, sans-serif'; x.fillText('Código de verificación', W - 130, 1012);
  return c;
}
async function certificado() {
  if (!todoHecho()) { mapa(); return; }
  pintar(`<div class="card centro"><h2 style="justify-content:center">${ICONO.trofeo} Tu certificado</h2>
      <p class="suave" id="gen">Generando…</p><div id="certzona"></div></div>`);
  const url = (await dibujarCertificado()).toDataURL('image/png');
  const archivo = `Certificado-Gopher-Laberinto-${E.nombre}-${E.apellido}.png`.replace(/\s+/g, '-');
  $('#certzona').innerHTML = `<img class="cert" src="${url}" alt="Certificado de ${esc(E.nombre)} ${esc(E.apellido)}">
    <div class="fila-btn"><a class="btn grande" id="descargar" href="${url}" download="${esc(archivo)}">${ICONO.descargar} Descargar certificado</a></div>
    <p class="suave">En el celular también puedes mantener presionada la imagen para guardarla.</p>
    <div class="fila-btn"><button class="btn sec" id="inf">${ICONO.informe} Ver mi informe</button><button class="btn sec" id="mapa">${ICONO.mapa} Volver al mapa</button></div>`;
  $('#gen').remove();
  $('#mapa').onclick = mapa;
  $('#inf').onclick = informe;
  confeti();
}

/* ---------------- arranque ---------------- */
async function arrancar() {
  MAPA = await abrirCon(J.mapa, J.sal, 'mapa');
  K0 = await Cifra.huella(J.sal, 'inicio');
  E = cargar();
  sprites();
  inicio();
}
Promise.all([document.fonts.load('15px "JetBrains Mono"'), document.fonts.load('700 16px Poppins'), document.fonts.load('400 15px Poppins')])
  .catch(() => null).then(arrancar);
