window.addEventListener("DOMContentLoaded", () => {

    cargarMaterias();

    mostrarSeleccionadas();

    const buscador =
        document.getElementById("busqueda");

    buscador.addEventListener("input", (e) => {

        buscarMateria(e.target.value);

    });

});