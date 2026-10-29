let seleccionadas =
    JSON.parse(
        localStorage.getItem(
            "materiasSeleccionadas"
        )
    ) || [];

// Agregar materia
function agregarMateria(nrc) {

    const materia =
        materias.find(m => m.nrc === nrc);

    const existe =
        seleccionadas.some(
            m => m.nrc === materia.nrc
        );

    if (existe) {

        alert("La materia ya fue agregada");

        return;
    }

    seleccionadas.push(materia);

    guardarSeleccion();

    mostrarSeleccionadas();

}

// Eliminar materia
function eliminarMateria(nrc) {

    seleccionadas =
        seleccionadas.filter(
            m => m.nrc !== nrc
        );

    guardarSeleccion();

    mostrarSeleccionadas();

}

// Guardar en localStorage
function guardarSeleccion() {

    localStorage.setItem(
        "materiasSeleccionadas",
        JSON.stringify(seleccionadas)
    );

}

// Mostrar seleccionadas
function mostrarSeleccionadas() {

    const lista =
        document.getElementById(
            "listaSeleccionadas"
        );

    lista.innerHTML = "";

    seleccionadas.forEach(materia => {

        const div =
            document.createElement("div");

        div.classList.add("materia");

        div.innerHTML = `

            <div>

                <h4>${materia.nombre}</h4>

                <small>${materia.nrc}</small>

            </div>

            <button
                onclick="eliminarMateria('${materia.nrc}')"
            >
                Eliminar
            </button>

        `;

        lista.appendChild(div);

    });

    document.getElementById(
        "contadorSeleccionadas"
    ).textContent =
        `${seleccionadas.length} seleccionadas`;

}