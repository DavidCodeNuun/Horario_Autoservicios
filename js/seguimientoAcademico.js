let curriculum = [];

const estadoAcademico = {
    semestreActual: 1,
    materiasEnCurso: []
};

async function cargarCurriculum() {
    try {
        const response = await fetch("./data/curriculum.json");

        if (!response.ok) {
            throw new Error("No se pudo cargar curriculum.json");
        }

        curriculum = await response.json();

        console.log("Curriculum cargado:");
        console.log(curriculum);

    } catch (error) {
        console.error(error);
    }
}

function alternarMateria(idMateria) {

    const indice =
        estadoAcademico.materiasEnCurso.indexOf(idMateria);

    if (indice === -1) {

        estadoAcademico.materiasEnCurso.push(idMateria);

    } else {

        estadoAcademico.materiasEnCurso.splice(indice, 1);

    }

    actualizarContadores();

    renderizarMapaCurricular();
}

function actualizarContadores() {

    const totalEnCurso =
        estadoAcademico.materiasEnCurso.length;

    document.getElementById("cardEnCurso")
        .textContent = totalEnCurso;
}

function renderizarMapaCurricular() {

    const grid = document.getElementById("curriculumGrid");

    let html = "";

    for (let semestre = 1; semestre <= 10; semestre++) {

        const materiasSemestre = curriculum.filter(
            materia => materia.semestre === semestre
        );

        html += `
            <div class="semester-column">

                <div class="semester-title">
                    ${semestre}°
                </div>
        `;

        materiasSemestre.forEach(materia => {

            const enCurso =
                estadoAcademico.materiasEnCurso.includes(
                    materia.id
                );

            const claseEstado =
                enCurso
                    ? "subject-current"
                    : "";

            html += `
            <div
                class="subject-card ${claseEstado}"
                onclick="alternarMateria('${materia.id}')"
                data-id="${materia.id}">

                ${materia.nombre}

            </div>
            `;
        });

        html += `
            </div>
        `;
    }

    grid.innerHTML = html;
}

async function inicializarSeguimientoAcademico() {

    await cargarCurriculum();

    renderizarMapaCurricular();

}

document.addEventListener("DOMContentLoaded", () => {
    inicializarSeguimientoAcademico();
});

window.alternarMateria = alternarMateria;