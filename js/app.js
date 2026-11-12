let data = [];
const $ = (id) => document.getElementById(id);
const PERIODO_ACADEMICO ="Primavera 2027";

const COLORES_CURSO = [
    "course-blue",
    "course-green",
    "course-yellow",
    "course-pink",
    "course-purple",
    "course-cyan"
];

let chosen = new Set();
let allowed = new Set();

let filtroHoraInicio = "";
let filtroHoraFin = "";
let filtroAula = "";

let currentCombination = 1;

const combinaciones = [
    {
        materias: [],
        cursos: []
    },
    {
        materias: [],
        cursos: []
    },
    {
        materias: [],
        cursos: []
    }
];


try {

    const saved = JSON.parse(
        localStorage.getItem("buap-planner-v2")
    );

    if (saved?.combinations) {

        saved.combinations.forEach(
            (comb, index) => {

                if (!combinaciones[index])
                    return;

                combinaciones[index].materias =
                    comb.materias || [];

                combinaciones[index].cursos =
                    comb.cursos || [];
            }
        );

        currentCombination =
            saved.currentCombination || 1;

        const actual =
            combinaciones[
                currentCombination - 1
            ];

        chosen =
            new Set(actual.materias);

        allowed =
            new Set(actual.cursos);
    }

} catch {

    console.warn(
        "No fue posible recuperar los datos guardados."
    );

}

function persist() {

    guardarCombinacionActual();

    localStorage.setItem(
        "buap-planner-v2",
        JSON.stringify({
            combinations: combinaciones.map(c => ({
                materias: c.materias,
                cursos: c.cursos
            })),
            currentCombination
        })
    );

}

async function cargarMaterias() {
    try {
        const respuesta = await fetch("./data/materias.json");
        const materias = await respuesta.json();

        const agrupadas = {};

        materias.forEach(materia => {

            const nombre = materia.nombre;

            if (!agrupadas[nombre]) {
                agrupadas[nombre] = {
                    name: nombre,
                    sections: []
                };
            }

            agrupadas[nombre].sections.push({
                nrc: materia.nrc,
                profesor: materia.profesor,
                horarios: materia.horarios,
                creditos: materia.creditos
            });
        });

        data = Object.values(agrupadas);
        
        cargarAulas();

        render();
        renderSchedule();
        actualizarIndicadorCombinacion();

    } catch (error) {
        console.error(
            "Error al cargar materias:",
            error
        );

        $("sections").innerHTML = `
            <p>Error al cargar las materias.</p>
        `;
    }
}

function cargarAulas() {

    const aulas = new Set();

    data.forEach(materia => {
        materia.sections.forEach(section => {
            section.horarios.forEach(horario => {
                if (horario.aula) {
                    aulas.add(horario.aula);
                }
            });
        });
    });

    const select = $("filtroAula");

    select.innerHTML =
        '<option value="">Todas</option>';

    [...aulas]
        .sort()
        .forEach(aula => {

            const option =
                document.createElement("option");

            option.value = aula;
            option.textContent = aula;

            select.appendChild(option);

        });

}

function actualizarHorasFin() {

    const inicio = $("horaInicio").value;
    const fin = $("horaFin");

    const opciones = fin.querySelectorAll("option");

    opciones.forEach(opcion => {

        if (opcion.value === "") return;

        opcion.hidden =
            inicio && opcion.value < inicio;

    });

    if (
        fin.value &&
        inicio &&
        fin.value < inicio
    ) {
        fin.value = "";
        filtroHoraFin = "";
    }
}

function existeConflicto(nrcNuevo) {

    const nuevaSeccion = data
        .flatMap(m => m.sections)
        .find(s => s.nrc === nrcNuevo);

    if (!nuevaSeccion) return false;

    const seccionesSeleccionadas = data
        .flatMap(m => m.sections)
        .filter(s => allowed.has(s.nrc));

    for (const existente of seccionesSeleccionadas) {

        for (const h1 of nuevaSeccion.horarios) {

            for (const h2 of existente.horarios) {

                if (h1.dia !== h2.dia) continue;

                const inicio1 = h1.inicio;
                const fin1 = h1.fin;

                const inicio2 = h2.inicio;
                const fin2 = h2.fin;

                const traslape =
                    inicio1 <= fin2 &&
                    fin1 >= inicio2;

                if (traslape) {
                    return true;
                }
            }
        }
    }

    return false;
}

function hayConflictoEntreCursos(
    cursoA,
    cursoB
) {

    for (const h1 of cursoA.horarios) {

        for (const h2 of cursoB.horarios) {

            if (h1.dia !== h2.dia)
                continue;

            const traslape =
                h1.inicio <= h2.fin &&
                h1.fin >= h2.inicio;

            if (traslape) {
                return true;
            }

        }

    }

    return false;

}

function render() {

    const q =
        $("search")
            .value
            .toLowerCase();

    $("count").textContent =
        `${data.length} materias`;

    $("selected").textContent =
        `${chosen.size} materias seleccionadas`;

    $("subjects").innerHTML = data
        .map((m, i) => {

            if (
                !m.name
                    .toLowerCase()
                    .includes(q)
            ) {
                return "";
            }

            return `
                <label class="subject ${chosen.has(i) ? "checked" : ""}">
                    
                    <input
                        type="checkbox"
                        data-subject="${i}"
                        ${chosen.has(i) ? "checked" : ""}
                    >

                    <span>
                        <strong>${m.name}</strong>
                    </span>

                </label>
            `;
        })
        .join("");

    $("sections").innerHTML =
        [...chosen]
            .map(i => {

                const materia = data[i];

                return `
                    <details open class="group">

                        <summary>

                            <div>
                                <strong>${materia.name}</strong>
                            </div>

                            <span>
                                ${materia.sections.length}
                                horarios disponibles
                            </span>

                        </summary>

                        <table>

                            <thead>
                                <tr>
                                    <th>Seleccionar</th>
                                    <th>NRC</th>
                                    <th>Días</th>
                                    <th>Horario</th>
                                    <th>Aula</th>
                                    <th>Profesor</th>
                                    <th>Créditos</th>
                                </tr>
                            </thead>

                            <tbody>

                                ${materia.sections
                        .filter(section => {

                            const cumpleHora =
                                section.horarios.some(h => {

                                    const inicio =
                                        h.inicio;

                                    if (
                                        filtroHoraInicio &&
                                        inicio < filtroHoraInicio
                                    ) {
                                        return false;
                                    }

                                    if (
                                        filtroHoraFin &&
                                        inicio > filtroHoraFin
                                    ) {
                                        return false;
                                    }

                                    return true;
                                });

                            const cumpleAula =
                                !filtroAula ||
                                section.horarios.some(
                                    h => h.aula === filtroAula
                                );

                            return (
                                cumpleHora &&
                                cumpleAula
                            );

                        })
                        .map(section => {

                            const dias =
                                section.horarios
                                    .map(h => h.dia)
                                    .join("<br>");

                            const horarios =
                                section.horarios
                                    .map(h =>
                                        `${h.inicio} - ${h.fin}`
                                    )
                                    .join("<br>");

                            const aulas =
                                section.horarios
                                    .map(h => h.aula)
                                    .join("<br>");

                            return `
                                            <tr>

                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        data-section="${section.nrc}"
                                                        ${allowed.has(section.nrc) ? "checked" : ""}
                                                    >
                                                </td>

                                                <td>
                                                    ${section.nrc}
                                                </td>

                                                <td>
                                                    ${dias}
                                                </td>

                                                <td>
                                                    ${horarios}
                                                </td>

                                                <td>
                                                    ${aulas}
                                                </td>
                                                
                                                <td>
                                                    ${section.profesor}
                                                </td>

                                                <td>
                                                    ${section.creditos}
                                                </td>

                                            </tr>
                                        `;

                        })
                        .join("")
                    }

                            </tbody>

                        </table>

                    </details>
                `;

            })
            .join("")

        ||

        `
            <p>
                Selecciona una materia para consultar sus horarios.
            </p>
        `;
}

$("subjects").onchange = (e) => {

    const index =
        Number(
            e.target.dataset.subject
        );

    if (e.target.checked) {
        chosen.add(index);
    } else {
        chosen.delete(index);
    }

    persist();
    render();
};

$("sections").onchange = (e) => {

    const nrc =
        e.target.dataset.section;

    if (!nrc) return;

    if (e.target.checked) {

        if (existeConflicto(nrc)) {

            alert(
                "\n⚠️ CONFLICTO DE HORARIO\n\nEl curso que intentas seleccionar coincide con el horario de otro curso ya agregado."
            );

            e.target.checked = false;

            return;
        }

        allowed.add(nrc);

    } else {

        allowed.delete(nrc);

    }

    persist();

    renderSchedule();

};

$("search").oninput = render;

$("horaInicio").addEventListener(
    "change",
    e => {

        filtroHoraInicio =
            e.target.value;
        actualizarHorasFin();
        render();

    }
);

$("horaFin").addEventListener(
    "change",
    e => {

        filtroHoraFin =
            e.target.value;

        render();

    }
);

$("filtroAula").addEventListener(
    "change",
    e => {

        filtroAula =
            e.target.value;

        render();

    }
);

$("clearFilters").addEventListener(
    "click",
    () => {

        filtroHoraInicio = "";
        filtroHoraFin = "";
        filtroAula = "";

        $("horaInicio").value = "";
        $("horaFin").value = "";
        $("filtroAula").value = "";

        actualizarHorasFin();
        
        render();

    }
);

function renderSchedule() {

    const dias = [
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sabado"
    ];

    const horas = [];

    for (let h = 7; h <= 21; h++) {

        horas.push(
            `${String(h).padStart(2, "0")}:00`
        );

    }

    let html = `
        <table class="schedule-table">

            <thead>
                <tr>
                    <th>Hora</th>
                    ${dias.map(
        d => `<th>${d}</th>`
    ).join("")}
                </tr>
            </thead>

            <tbody>
    `;

    horas.forEach(hora => {

        html += `<tr>`;

        html += `
            <td class="hour-cell">
                ${hora}
            </td>
        `;

        dias.forEach(dia => {

            let contenido = "";

            data.forEach(materia => {

                materia.sections.forEach(section => {

                    if (!allowed.has(section.nrc))
                        return;

                    section.horarios.forEach(h => {

                        const ocupaHora =
                            hora >= h.inicio &&
                            hora <= h.fin;

                        if (h.dia.trim() === dia.trim() && ocupaHora) {

                            const color = COLORES_CURSO[parseInt(section.nrc) % COLORES_CURSO.length];

                            contenido += `
                                <div class="schedule-course ${color}">

                                    <div class="course-name">
                                        ${materia.name}
                                    </div>

                                    <div class="course-nrc">
                                        ${section.nrc}
                                    </div>

                                    <div class="course-professor">
                                        ${section.profesor}
                                     </div>

                                    <div class="course-room">
                                        » ${h.aula}
                                    </div>

                                 </div>
                            `;

                        }

                    });

                });

            });

            html += `
                <td>
                    ${contenido}
                </td>
            `;

        });

        html += `</tr>`;

    });

    html += `
            </tbody>
        </table>
    `;

    $("schedule").innerHTML = html;

}

function actualizarIndicadorCombinacion() {

    const indicador =
        $("combinationIndicator");

    if (!indicador) return;

    indicador.textContent =
        `Combinación ${currentCombination} de 3`;

}

function obtenerCombinacionActual() {

    return combinaciones[
        currentCombination - 1
    ];

}

function guardarCombinacionActual() {

    const combinacion =
        obtenerCombinacionActual();

    combinacion.materias =
        [...chosen];

    combinacion.cursos =
        [...allowed];

}

function cargarCombinacionActual() {

    const combinacion =
        obtenerCombinacionActual();

    chosen =
        new Set(combinacion.materias);

    allowed =
        new Set(combinacion.cursos);

    render();

    renderSchedule();

}

$("prevCombination")?.addEventListener(
    "click",
    () => {

        if (currentCombination > 1) {

            guardarCombinacionActual();

            currentCombination--;

            cargarCombinacionActual();

            actualizarIndicadorCombinacion();

            persist();
        }

    }
);

$("nextCombination")?.addEventListener(
    "click",
    () => {

        if (currentCombination < 3) {

            guardarCombinacionActual();

            currentCombination++;

            cargarCombinacionActual();

            actualizarIndicadorCombinacion();

            persist();
        }

    }
);

function cursoDentroDelRango(section) {

    return section.horarios.every(h => {

        return (
            h.inicio >= filtroHoraInicio &&
            h.inicio <= filtroHoraFin
        );

    });

}

function obtenerCursosCompatibles() {

    const materiasSeleccionadas =
        Array.from(chosen)
            .map(index => data[index]);

    return materiasSeleccionadas.map(materia => ({

        nombre: materia.name,

        opciones: materia.sections.filter(
            cursoDentroDelRango
        )

    }));

}

function generarCombinacionBacktracking() {

    const materias =
        obtenerCursosCompatibles();

    let mejorResultado = [];

    function resolver(
        indiceMateria,
        resultadoActual
    ) {

        if (
            resultadoActual.length >
            mejorResultado.length
        ) {

            mejorResultado =
                [...resultadoActual];

        }

        if (
            indiceMateria >= materias.length
        ) {
            return;
        }

        const materia =
            materias[indiceMateria];

        for (
            const curso of materia.opciones
        ) {

            const tieneConflicto =
                resultadoActual.some(
                    seleccionado =>
                        hayConflictoEntreCursos(
                            seleccionado,
                            curso
                        )
                );

            if (tieneConflicto) {
                continue;
            }

            resultadoActual.push(curso);

            resolver(
                indiceMateria + 1,
                resultadoActual
            );

            resultadoActual.pop();
        }

        resolver(
            indiceMateria + 1,
            resultadoActual
        );
    }

    resolver(
        0,
        []
    );

    return mejorResultado;
}

function generarHorario() {

    if (chosen.size === 0) {

        alert(
            "Selecciona al menos una materia antes de generar un horario."
        );

        return;
    }

    if (!filtroHoraInicio) {

        alert(
            "Selecciona una hora de inicio."
        );

        return;
    }

    if (!filtroHoraFin) {

        alert(
            "Selecciona una hora de fin."
        );

        return;
    }

    const materias =
        obtenerCursosCompatibles();

    const combinacion =
        generarCombinacionBacktracking();

    if (
        combinacion.length === 0
    ) {

        alert(
            "No fue posible generar ninguna alternativa dentro del rango seleccionado."
        );

        return;
    }

    const totalMaterias = materias.length;

    const materiasIncluidas = new Set(
        combinacion.map(curso => {

            const materia = materias.find(
                m => m.opciones.some(
                    op => op.nrc === curso.nrc
                )
            );

            return materia?.nombre;
        })
    );

    const descartadas =
        materias
            .filter(
                m => !materiasIncluidas.has(
                    m.nombre
                )
            )
            .map(
                m => m.nombre
            );

    let mensaje = `Horario generado correctamente.\n\n`;

    mensaje += `Se logró acomodar ${combinacion.length} de ${totalMaterias} materias seleccionadas.`;

    if (descartadas.length > 0) {
        mensaje += `\n\nMaterias descartadas:\n• ` + descartadas.join("\n• ");
    }

    alert(mensaje);

    allowed.clear();

    combinacion.forEach(curso => {

    allowed.add(
        curso.nrc
    );

    });
    persist();
    render();
    renderSchedule();

}

async function exportarPNG() {

    const horario =
        document.getElementById("schedule");

    const canvas =
        await html2canvas(horario, {
            scale: 2,
            backgroundColor: "#ffffff"
        });

    const enlace =
        document.createElement("a");

    enlace.download =
        "Horario_BUAP.png";

    enlace.href =
        canvas.toDataURL("image/png");

    enlace.click();
}

function obtenerCursosPDF() {

    const dias = {
        "Lunes": [],
        "Martes": [],
        "Miércoles": [],
        "Jueves": [],
        "Viernes": [],
        "Sabado": []
    };

    data.forEach(materia => {

        materia.sections.forEach(section => {

            if (!allowed.has(section.nrc)) {
                return;
            }

            section.horarios.forEach(horario => {

                dias[horario.dia].push({

                    nombre: materia.name,

                    nrc: section.nrc,

                    profesor: section.profesor,

                    inicio: horario.inicio,

                    fin: horario.fin,

                    aula: horario.aula

                });

            });

        });

    });

    Object.keys(dias).forEach(dia => {

        dias[dia].sort(
            (a, b) =>
                a.inicio.localeCompare(
                    b.inicio
                )
        );

    });

    return dias;
}

function exportarPDF() {

    const dias =
        obtenerCursosPDF();

    const { jsPDF } =
        window.jspdf;

    const pdf =
        new jsPDF(
            "p",
            "mm",
            "a4"
        );

    const fecha =
        new Date().toLocaleDateString(
            "es-MX"
        );

    const textoCombinacion =
        document
            .getElementById(
                "combinationIndicator"
            )
            .textContent;

    const numeroCombinacion =
        textoCombinacion.match(/\d+/)?.[0] || "1";

    let y = 20;

    pdf.setFont(
        "helvetica",
        "bold"
    );

    pdf.setFontSize(18);

    pdf.text(
        "Horario BUAP",
        105,
        y,
        {
            align: "center"
        }
    );

    y += 12;

    pdf.setFont(
        "helvetica",
        "normal"
    );

    pdf.setFontSize(12);

    pdf.text(
        `BUAP: Periodo ${PERIODO_ACADEMICO}`,
        10,
        y
    );

    pdf.text(
        `Fecha: ${fecha}`,
        150,
        y
    );

    y += 5;

    pdf.text(
        `Combinación seleccionada: ${numeroCombinacion}`,
        10,
        y
    );

    y += 10;

    Object.entries(dias).forEach(
        ([dia, cursos]) => {

            if (
                cursos.length === 0
            ) {
                return;
            }

            if (y > 240) {
                pdf.addPage();
                y = 20;
            }

            pdf.setFont(
                "helvetica",
                "bold"
            );

            pdf.setFontSize(14);

            pdf.text(
                dia.toUpperCase(),
                10,
                y
            );

            y += 8;

            cursos.forEach(curso => {

                if (y > 250) {
                    pdf.addPage();
                    y = 20;
                }

                pdf.setFont(
                    "helvetica",
                    "bold"
                );

                pdf.setFontSize(11);

                pdf.text(
                    `${curso.inicio} - ${curso.fin} | ${curso.nombre}`,
                    10,
                    y
                );

                y += 6;

                pdf.setFont(
                    "helvetica",
                    "normal"
                );

                pdf.text(
                    `NRC: ${curso.nrc}`,
                    15,
                    y
                );

                y += 5;

                pdf.text(
                    `Profesor: ${curso.profesor}`,
                    15,
                    y
                );

                y += 5;

                pdf.text(
                    `Aula: ${curso.aula}`,
                    15,
                    y
                );

                y += 8;

                pdf.line(
                    10,
                    y,
                    190,
                    y
                );

                y += 6;

            });

            y += 5;

        }
    );

    pdf.save(
        "Horario_BUAP.pdf"
    );
}


$("generateSchedule")?.addEventListener("click",generarHorario);

$("exportPNG")?.addEventListener(
    "click",
    exportarPNG
);

$("exportPDF")?.addEventListener(
    "click",
    exportarPDF
);
/* =========================
   MAPA CURRICULAR
========================= */

$("btnMapaCurricular")?.addEventListener(
    "click",
    () => {
        $("modalMapaCurricular")
            .classList.add("active");
    }
);

$("cerrarMapaCurricular")?.addEventListener(
    "click",
    () => {
        $("modalMapaCurricular")
            .classList.remove("active");
    }
);
cargarMaterias();