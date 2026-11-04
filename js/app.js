const names = [
    'Computación MUM',
    'Computación Semestral',
    'Comunicación',
    'Teoría de la Arquitectura',
    'Dibujo Arquitectónico',
    'Matemáticas I',
    'Física I',
    'Historia del Arte',
    'Programación Concurrente',
    'Ingeniería de Software',
    'Bases de Datos',
    'Redes de Computadoras'
];

const areas = [
    'Computación',
    'Computación',
    'Comunicación',
    'Arquitectura',
    'Arquitectura',
    'Matemáticas',
    'Física',
    'Arquitectura',
    'Computación',
    'Computación',
    'Computación',
    'Computación'
];

const data = names.map((name, i) => ({
    name,
    area: areas[i],

    code:
        [
            'MAT101',
            'MAT102',
            'MAT103',
            'ARQ201',
            'ARQ202',
            'MAT201',
            'FIS101',
            'ARQ210'
        ][i] || 'CC' + (201 + i),

    sections: (
        i === 0
            ? [
                [12345, [0, 2, 4], 8, 9, 'A-101', 'Mtro. López'],
                [12346, [1, 3], 10, 12, 'C-203', 'Dra. García'],
                [12347, [0, 2, 4], 12, 13, 'A-105', 'Mtro. Pérez']
            ]
            : i === 1
                ? [
                    [22311, [0, 2], 9, 11, 'B-201', 'Dra. Ramírez'],
                    [22312, [1, 3], 14, 16, 'B-305', 'Mtro. Torres']
                ]
                : [
                    [
                        30000 + i,
                        [i % 5],
                        7 + (i % 7),
                        8 + (i % 7),
                        'CC-' + (201 + i),
                        'Profesor por confirmar'
                    ]
                ]
    ).map(
        ([nrc, days, start, end, room, teacher]) => ({
            nrc,
            days,
            start,
            end,
            room,
            teacher,
            credits: i === 1 ? 5 : 4
        })
    )
}));

const $ = (id) => document.getElementById(id);

const dayNames = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo'
];

let chosen = new Set();

let allowed = new Set();

try {
    const saved = JSON.parse(
        localStorage.getItem('buap-planner-v2')
    );

    if (saved) {
        chosen = new Set(saved.chosen);
        allowed = new Set(saved.allowed);
    }
} catch {
    // Ignorar errores de lectura
}

const time = (n) =>
    String(n).padStart(2, '0') + ':00';

function persist() {
    localStorage.setItem(
        'buap-planner-v2',
        JSON.stringify({
            chosen: [...chosen],
            allowed: [...allowed]
        })
    );
}

function render() {

    const q = $('search').value.toLocaleLowerCase();

    $('count').textContent =
        data.length + ' materias';

    $('selected').textContent =
        chosen.size + ' materias seleccionadas';

    $('subjects').innerHTML = data
        .map((m, i) =>
            m.name.toLocaleLowerCase().includes(q)
                ? `
                    <label class="subject ${chosen.has(i) ? 'checked' : ''}">
                        
                        <input
                            type="checkbox"
                            data-subject="${i}"
                            ${chosen.has(i) ? 'checked' : ''}
                        >

                        <span>
                            <strong>${m.name}</strong>
                            <small>${m.code}</small>
                        </span>

                        <em>${m.area}</em>

                    </label>
                `
                : ''
        )
        .join('');

    $('sections').innerHTML =
        [...chosen]
            .map(i => {

                const m = data[i];

                return `
                    <details open class="group">

                        <summary>

                            ⌃ ☑

                            <div>
                                <strong>${m.name}</strong>

                                <small>
                                    ${m.code} | ${m.area}
                                </small>
                            </div>

                            <span>
                                ${m.sections.length}
                                horarios disponibles ›
                            </span>

                        </summary>

                        <table>

                            <thead>
                                <tr>
                                    ${
                                        [
                                            'Seleccionar',
                                            'NRC',
                                            'Días',
                                            'Horario',
                                            'Aula',
                                            'Profesor',
                                            'Créditos'
                                        ]
                                        .map(v => `<th>${v}</th>`)
                                        .join('')
                                    }
                                </tr>
                            </thead>

                            <tbody>

                                ${
                                    m.sections
                                    .map(s => `
                                        <tr>

                                            <td>
                                                <input
                                                    aria-label="Seleccionar NRC ${s.nrc}"
                                                    type="checkbox"
                                                    data-section="${s.nrc}"
                                                    ${allowed.has(s.nrc) ? 'checked' : ''}
                                                >
                                            </td>

                                            <td>${s.nrc}</td>

                                            <td>
                                                ${
                                                    s.days
                                                        .map(d =>
                                                            dayNames[d].slice(0, 3)
                                                        )
                                                        .join(', ')
                                                }
                                            </td>

                                            <td>
                                                ${time(s.start)}
                                                -
                                                ${time(s.end)}
                                            </td>

                                            <td>${s.room}</td>

                                            <td>${s.teacher}</td>

                                            <td>${s.credits}</td>

                                        </tr>
                                    `)
                                    .join('')
                                }

                            </tbody>

                        </table>

                    </details>
                `;
            })
            .join('')

        ||

        `
            <p>
                Selecciona una materia para consultar sus horarios.
            </p>
        `;
}

$('subjects').onchange = (e) => {

    const i = Number(
        e.target.dataset.subject
    );

    if (e.target.checked) {
        chosen.add(i);
    } else {
        chosen.delete(i);
    }

    persist();
    render();
};

$('sections').onchange = (e) => {

    const n = Number(
        e.target.dataset.section
    );

    if (e.target.checked) {
        allowed.add(n);
    } else {
        allowed.delete(n);
    }

    persist();
};

$('search').oninput = render;


render();
