let materias = [];

// Cargar materias desde JSON
async function cargarMaterias() {

    try {

        const respuesta = await fetch("./data/materias.json");

        materias = await respuesta.json();

        mostrarMaterias(materias);

        document.getElementById("contadorMaterias").textContent =
            `${materias.length} materias`;

    } catch (error) {

        console.error("Error al cargar materias:", error);

    }
}

// Mostrar materias
function mostrarMaterias(lista) {

    const contenedor =
        document.getElementById("listaMaterias");

    contenedor.innerHTML = "";

    lista.forEach(materia => {

        const div =
            document.createElement("div");

        div.classList.add("materia");

        div.innerHTML = `

            <div>

                <h4>${materia.nombre}</h4>

                <small>NRC: ${materia.nrc}</small>

            </div>

            <div>

                <button onclick="mostrarDetalle('${materia.nrc}')">
                    Ver
                </button>

                <button onclick="agregarMateria('${materia.nrc}')">
                    Agregar
                </button>

            </div>

        `;

        contenedor.appendChild(div);

    });

}

// Mostrar detalles
function mostrarDetalle(nrc) {

    const materia =
        materias.find(m => m.nrc === nrc);

    if (!materia) return;

    const detalle =
        document.getElementById("detalleMateria");

    detalle.innerHTML = `

        <div class="detalle">

            <h3>${materia.nombre}</h3>

            <p><strong>NRC:</strong> ${materia.nrc}</p>

            <p><strong>Profesor:</strong> ${materia.profesor}</p>

            <p><strong>Horario:</strong> ${materia.horario}</p>

            <p><strong>Aula:</strong> ${materia.aula}</p>

        </div>

    `;

}

// Busqueda
function buscarMateria(texto) {

    const resultado =
        materias.filter(materia =>
            materia.nombre
                .toLowerCase()
                .includes(texto.toLowerCase())
        );

    mostrarMaterias(resultado);

}