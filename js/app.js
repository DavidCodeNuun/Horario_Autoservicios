let data = [];

const $ = (id) => document.getElementById(id);

let chosen = new Set();
let allowed = new Set();

let filtroHoraInicio = "";
let filtroHoraFin = "";
let filtroAula = "";


try {
    const saved = JSON.parse(
        localStorage.getItem("buap-planner-v2")
    );

    if (saved) {
        chosen = new Set(saved.chosen || []);
        allowed = new Set(saved.allowed || []);
    }
} catch {
    console.warn("No fue posible recuperar los datos guardados.");
}

function persist() {
    localStorage.setItem(
        "buap-planner-v2",
        JSON.stringify({
            chosen: [...chosen],
            allowed: [...allowed]
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
                aula: materia.aula,
                creditos: materia.creditos
            });
        });

        data = Object.values(agrupadas);
        
        cargarAulas();

        render();

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
        allowed.add(nrc);
    } else {
        allowed.delete(nrc);
    }

    persist();
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

cargarMaterias();