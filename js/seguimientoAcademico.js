// ============================================================
// SEGUIMIENTO ACADÉMICO - MAPA CURRICULAR 【entity-BUAP¦canonical_name=BUAP】
// Ingeniería en Ciencias de la Computación · Plan 2017
// Estructura: columnas por periodo 1-10, como la imagen oficial
// Color = Área. Estado = intensidad / borde
// ============================================================

let curriculum = [];

const estadoAcademico = {
    semestreActual: 3,
    materiasEnCurso: [],
    materiasAprobadas: [],
    materiasAprobadasManuales: [] // <- NUEVO: las que tú marcas con clic derecho
};

const NOMBRES_AREAS = {
    "Área de Ciencias Basicas": "Ciencias Básicas",
    "Área de Ingeniería en Computación": "Ingeniería en Computación",
    "Área de Tecnología": "Tecnología",
    "Área de Formación General Universitaria": "Formación General",
    "Área de Integración Disciplinaria": "Integración Disciplinaria",
    "Área de Integración Profesional": "Integración Profesional"
};

// ============================================================
// CARGA
// ============================================================

async function cargarCurriculum() {
    try {
        const response = await fetch("./data/curriculum.json");
        if (!response.ok) throw new Error("No se pudo cargar curriculum.json");
        curriculum = await response.json();
    } catch (error) {
        console.error(error);
        const grid = document.getElementById("curriculumGrid");
        if (grid) grid.innerHTML = "<p>Error al cargar el mapa curricular.</p>";
    }
}

function obtenerMateriaPorId(id) {
    return curriculum.find(m => m.id === id);
}

function areaClase(area) {
    if (!area) return "area-integracion";
    if (area.includes("Ciencias")) return "area-basicas";
    if (area.includes("Ingeniería en Computación")) return "area-ingenieria";
    if (area.includes("Tecnología")) return "area-tecnologia";
    if (area.includes("Formación")) return "area-formacion";
    return "area-integracion";
}

// ============================================================
// 1. APROBADAS INFERIDAS
// Si cursas una materia, sus prerrequisitos
// y los prerrequisitos de esos, cuentan como aprobados.
// ============================================================

function inferirMateriasAprobadas() {
    const aprobadas = new Set(estadoAcademico.materiasAprobadasManuales);

    function recorrer(idMateria) {
        const materia = obtenerMateriaPorId(idMateria);
        if (!materia) return;
        (materia.prerrequisitos || []).forEach(idPrereq => {
            aprobadas.add(idPrereq);
            recorrer(idPrereq);
        });
    }

    estadoAcademico.materiasEnCurso.forEach(id => recorrer(id));
    estadoAcademico.materiasEnCurso.forEach(id => aprobadas.delete(id));
    // Una aprobada manual no puede estar en curso al mismo tiempo
    estadoAcademico.materiasEnCurso.forEach(id => {
        const i = estadoAcademico.materiasAprobadasManuales.indexOf(id);
        if (i !== -1) estadoAcademico.materiasAprobadasManuales.splice(i, 1);
    });

    estadoAcademico.materiasAprobadas = [...aprobadas];
}

// ============================================================
// 2. PRIORITARIAS
// De tu semestre o de antes, sin aprobar y sin cursar.
// Ej: vas en 3°, cursas Física I -> Física II es prioritaria.
// Ej: vas en 5°, nunca cursaste Cálculo Integral -> prioritaria.
// ============================================================

function calcularPrioritarias() {
    const semestre = estadoAcademico.semestreActual;
    return curriculum.filter(m => {
        if (estadoAcademico.materiasAprobadas.includes(m.id)) return false;
        if (estadoAcademico.materiasEnCurso.includes(m.id)) return false;
        return m.semestre <= semestre;
    });
}

// ============================================================
// 3. ¿SE PUEDE CURSAR? - AQUÍ ESTABA EL ERROR
// ANTES: pedía aprobar todo lo anterior para cursar 3°.
// AHORA:
// - Si la materia es de tu semestre o de antes:
//   solo se bloquea si su prerrequisito está EN CURSO.
//   Ej: no puedes cursar Física I y Física II a la vez.
// - Si la materia es de un semestre futuro:
//   sí debe tener el prerrequisito aprobado.
// ============================================================

function obtenerBloqueo(materia) {
    if (estadoAcademico.materiasAprobadas.includes(materia.id)) {
        return `Ya aprobaste ${materia.nombre}.`;
    }

    for (const idPrereq of (materia.prerrequisitos || [])) {
        // Caso 1: prerrequisito en curso -> siempre bloquea
        if (estadoAcademico.materiasEnCurso.includes(idPrereq)) {
            const prereq = obtenerMateriaPorId(idPrereq);
            return `Para cursar ${materia.nombre} primero deselecciona ${prereq ? prereq.nombre : idPrereq}, que estás cursando ahorita.`;
        }

        // Caso 2: materia futura -> exige prerrequisito aprobado
        const esMateriaFutura = materia.semestre > estadoAcademico.semestreActual;
        if (esMateriaFutura && !estadoAcademico.materiasAprobadas.includes(idPrereq)) {
            const prereq = obtenerMateriaPorId(idPrereq);
            return `Para cursar ${materia.nombre} primero debes aprobar ${prereq ? prereq.nombre : idPrereq}.`;
        }
    }
    return null;
}

function mostrarWarning(mensaje) {
    const warning = document.getElementById("academicWarning");
    if (!warning) return;
    if (!mensaje) {
        warning.classList.add("hidden");
        warning.textContent = "";
        return;
    }
    warning.classList.remove("hidden");
    warning.textContent = mensaje;
}

// ============================================================
// 4. CLIC
// ============================================================

function alternarMateria(idMateria) {
    const materia = obtenerMateriaPorId(idMateria);
    if (!materia) return;

    const indice = estadoAcademico.materiasEnCurso.indexOf(idMateria);

    if (indice !== -1) {
        // Ya está en curso -> deseleccionar, siempre se puede
        estadoAcademico.materiasEnCurso.splice(indice, 1);
        mostrarWarning(null);
    } else {
        const bloqueo = obtenerBloqueo(materia);
        if (bloqueo) {
            mostrarWarning("🔒 " + bloqueo);
            return;
        }
        estadoAcademico.materiasEnCurso.push(idMateria);
        mostrarWarning(null);
    }

    inferirMateriasAprobadas();
    actualizarContadores();
    renderizarMapaCurricular();
}

// Clic derecho: marcar / desmarcar como Aprobada manual
// Para materias huérfanas como Graficación, Formación, DHPC, Inglés
function alternarAprobadaManual(idMateria) {
    const materia = obtenerMateriaPorId(idMateria);
    if (!materia) return;

    const indice = estadoAcademico.materiasAprobadasManuales.indexOf(idMateria);

    if (indice !== -1) {
        // Ya estaba aprobada manual -> quitarla
        estadoAcademico.materiasAprobadasManuales.splice(indice, 1);
        mostrarWarning(null);
    } else {
        // Si estaba en curso, quitarla de en curso primero
        const enCursoIdx = estadoAcademico.materiasEnCurso.indexOf(idMateria);
        if (enCursoIdx !== -1) estadoAcademico.materiasEnCurso.splice(enCursoIdx, 1);

        estadoAcademico.materiasAprobadasManuales.push(idMateria);
        mostrarWarning(`✓ ${materia.nombre} marcada como Aprobada.`);
    }

    inferirMateriasAprobadas();
    actualizarContadores();
    renderizarMapaCurricular();
}
window.alternarAprobadaManual = alternarAprobadaManual;

// ============================================================
// 5. CONTADORES + AVANCE
// Avance SOLO con créditos aprobados. En curso NO cuenta.
// Pendientes = Total - Aprobadas - En curso
// ============================================================

function actualizarContadores() {
    const total = curriculum.length;
    const totalEnCurso = estadoAcademico.materiasEnCurso.length;
    const totalAprobadas = estadoAcademico.materiasAprobadas.length;
    const prioritarias = calcularPrioritarias();
    const totalPendientes = total - totalAprobadas - totalEnCurso;

    const elAprobadas = document.getElementById("cardAprobadas");
    const elEnCurso = document.getElementById("cardEnCurso");
    const elPendientes = document.getElementById("cardPendientes");
    const elPrioritarias = document.getElementById("cardPrioritarias");
    const elTotal = document.getElementById("cardTotal");

    if (elAprobadas) elAprobadas.textContent = totalAprobadas;
    if (elEnCurso) elEnCurso.textContent = totalEnCurso;
    if (elPendientes) elPendientes.textContent = totalPendientes;
    if (elPrioritarias) elPrioritarias.textContent = prioritarias.length;
    if (elTotal) elTotal.textContent = total + " materias";

    const creditosAprobados = curriculum
        .filter(m => estadoAcademico.materiasAprobadas.includes(m.id))
        .reduce((sum, m) => sum + (m.creditos || 0), 0);

    const creditosTotales = curriculum
        .reduce((sum, m) => sum + (m.creditos || 0), 0);

    const porcentaje = creditosTotales
        ? Math.round((creditosAprobados / creditosTotales) * 100)
        : 0;

    const elPorcentaje = document.getElementById("academicoPorcentaje");
    const elBarra = document.getElementById("barraProgreso");
    const elCreditos = document.getElementById("academicoCreditos");

    if (elPorcentaje) elPorcentaje.textContent = porcentaje + "%";
    if (elBarra) elBarra.style.width = porcentaje + "%";
    if (elCreditos) elCreditos.textContent = creditosAprobados + " / " + creditosTotales + " créditos";
}

// ============================================================
// 6. RENDER - COLUMNAS POR PERIODO, COMO LA IMAGEN OFICIAL
// ============================================================

function renderizarMapaCurricular() {
    const grid = document.getElementById("curriculumGrid");
    if (!grid) return;

    const idsPrioritarias = new Set(calcularPrioritarias().map(m => m.id));

    let html = "";

    // Envoltorio para poder dibujar las flechas por encima
    html += `<div class="mapa-wrapper">`;

    html += `<div class="mapa-niveles"><span class="nivel-basico">NIVEL BÁSICO - 22 MATERIAS</span><span class="nivel-formativo">NIVEL FORMATIVO - 28 MATERIAS</span></div>`;

    html += `<div class="mapa-periodos-header">`;
    for (let p = 1; p <= 10; p++) html += `<div class="mapa-periodo-titulo">${p}</div>`;
    html += `</div>`;

    html += `<div class="mapa-columnas">`;
    for (let periodo = 1; periodo <= 10; periodo++) {
        const materias = curriculum.filter(m => m.semestre === periodo);
        html += `<div class="semester-column">`;

        materias.forEach(materia => {
            const enCurso = estadoAcademico.materiasEnCurso.includes(materia.id);
            const aprobada = estadoAcademico.materiasAprobadas.includes(materia.id);
            const prioritaria = idsPrioritarias.has(materia.id);
            const bloqueo = !enCurso ? obtenerBloqueo(materia) : null;

            let claseEstado = "";
            let etiqueta = "";
            let icono = "";

            if (aprobada) { claseEstado = "subject-approved"; etiqueta = "Aprobada"; icono = "✓ "; }
            if (enCurso) { claseEstado = "subject-current"; etiqueta = "En curso"; icono = "● "; }
            if (prioritaria) { claseEstado += " subject-priority"; etiqueta = "Prioritaria"; icono = "⚠ "; }
            if (bloqueo && !aprobada && !prioritaria) { claseEstado += " subject-locked"; icono = "🔒 "; }

            html += `
            <div class="subject-card ${areaClase(materia.area)} ${claseEstado}"
                 onclick="alternarMateria('${materia.id}')"
                 oncontextmenu="event.preventDefault(); alternarAprobadaManual('${materia.id}')"
                 data-id="${materia.id}"
                 title="${(NOMBRES_AREAS[materia.area] || materia.area)} - ${bloqueo ? bloqueo : materia.nombre + " - " + (etiqueta || "Pendiente")}">
                <strong>${icono}${materia.nombre}</strong>
                <span class="subject-meta">${materia.creditos} créditos${etiqueta ? " · " + etiqueta : ""}</span>
            </div>`;
        });

        html += `</div>`;
    }
    html += `</div>`; // mapa-columnas
    html += `</div>`; // mapa-wrapper

    grid.innerHTML = html;

    // Dibujar flechas después de que el mapa ya existe
    requestAnimationFrame(() => dibujarFlechas());
}

// ============================================================
// FLECHAS: de prerrequisito -> materia que desbloquea
// Como en la imagen oficial
// ============================================================

function dibujarFlechas() {
    const wrapper = document.querySelector(".mapa-wrapper");
    const svg = document.getElementById("flechasSvg");
    if (!wrapper || !svg) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    svg.setAttribute("width", wrapper.scrollWidth);
    svg.setAttribute("height", wrapper.scrollHeight);
    svg.style.width = wrapper.scrollWidth + "px";
    svg.style.height = wrapper.scrollHeight + "px";

    let paths = `
        <defs>
            <marker id="flechaHead" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8" />
            </marker>
            <marker id="flechaHeadActiva" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#2563eb" />
            </marker>
        </defs>
    `;

    curriculum.forEach(materia => {
        const destino = wrapper.querySelector(`[data-id="${materia.id}"]`);
        if (!destino) return;

        (materia.prerrequisitos || []).forEach(idPrereq => {
            const origen = wrapper.querySelector(`[data-id="${idPrereq}"]`);
            if (!origen) return;

            const prereq = obtenerMateriaPorId(idPrereq);
            if (!prereq) return;

            // SOLO flechas entre periodos seguidos, como en el mapa oficial
            // Si salta de 1° a 3° o de 2° a 5°, NO dibujar, eso era lo feo
            if (materia.semestre !== prereq.semestre + 1) return;

            const r1 = origen.getBoundingClientRect();
            const r2 = destino.getBoundingClientRect();

            const x1 = r1.right - wrapperRect.left + wrapper.scrollLeft;
            const y1 = r1.top + r1.height / 2 - wrapperRect.top;
            const x2 = r2.left - wrapperRect.left + wrapper.scrollLeft - 8;
            const y2 = r2.top + r2.height / 2 - wrapperRect.top;

            if (x2 <= x1) return;

            // Flecha RECTA, no curva. Si no están a la misma altura, hace un codo chiquito
            let d;
            if (Math.abs(y2 - y1) < 10) {
                d = `M ${x1} ${y1} L ${x2} ${y2}`;
            } else {
                const midX = (x1 + x2) / 2;
                d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
            }

            const esActiva = estadoAcademico.materiasAprobadas.includes(idPrereq);
            const clase = esActiva ? "flecha-linea activa" : "flecha-linea";
            const marker = esActiva ? "url(#flechaHeadActiva)" : "url(#flechaHead)";

            paths += `<path d="${d}" class="${clase}" marker-end="${marker}" />`;
        });
    });

    svg.innerHTML = paths;
}

// ============================================================
// 7. INIT
// ============================================================

async function inicializarSeguimientoAcademico() {
    await cargarCurriculum();

    const selectSemestre = document.getElementById("semestreActual");
    if (selectSemestre) {
        estadoAcademico.semestreActual = parseInt(selectSemestre.value, 10) || 1;
        selectSemestre.addEventListener("change", (e) => {
            estadoAcademico.semestreActual = parseInt(e.target.value, 10);
            mostrarWarning(null);
            actualizarContadores();
            renderizarMapaCurricular();
        });
    }

    inferirMateriasAprobadas();
    actualizarContadores();
    renderizarMapaCurricular();
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarSeguimientoAcademico();
});

// Redibujar flechas al hacer scroll o cambiar tamaño
document.getElementById("curriculumGrid")?.addEventListener("scroll", () => {
    requestAnimationFrame(() => dibujarFlechas());
});
window.addEventListener("resize", () => {
    requestAnimationFrame(() => dibujarFlechas());
});

window.alternarMateria = alternarMateria;