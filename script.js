const API =
'https://script.google.com/macros/s/AKfycbzqMqPIDV9-dWtHQpPBDs3cQi349bJzInkQbJZeAaEsf8zwD-8ty4qlVdqRt5G4GaGg/exec';

let usuarioActual = '';
let materiasDocente = [];
let gruposPermitidos = [];

let graficaAsistencia = null;
let graficaGrupos = null;
let tipoHistorialPDF = 'GRUPAL';

// =====================================
// LOADER GLOBAL
// =====================================

function mostrarLoader(texto = 'Procesando...'){

  const loader =
    document.getElementById('loaderGlobal');

  const textoLoader =
    document.getElementById('textoLoader');

  if(textoLoader){
    textoLoader.textContent = texto;
  }

  if(loader){
    loader.style.display = 'flex';
  }
}

function ocultarLoader(){

  const loader =
    document.getElementById('loaderGlobal');

  if(loader){
    loader.style.display = 'none';
  }
}



// =====================================
// LOGIN
// =====================================

async function iniciarSesion(){

  const usuario =
    document.getElementById('usuario').value.trim();

  const password =
    document.getElementById('password').value.trim();

  if(!usuario || !password){

    mostrarMensajeSistema(
      'Escribe usuario y contraseña.',
      'info'
    );

    return;
  }

  mostrarLoader(
    'Iniciando sesión...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=login' +
        '&usuario=' +
        encodeURIComponent(usuario) +
        '&password=' +
        encodeURIComponent(password)
      );

    const datos =
      await respuesta.json();

    console.log(datos);

    if(datos.success){

      localStorage.setItem(
        'usuarioActivo',
        JSON.stringify(datos)
      );

      gruposPermitidos =
        Array.isArray(datos.grupos)
        ? datos.grupos
        : [];

      usuarioActual = usuario;
      await cargarMateriasDocente();

      mostrarSistema(datos);

      mostrarMensajeSistema(
        'Sesión iniciada correctamente.',
        'exito'
      );

    }else{

      mostrarMensajeSistema(
        'Usuario o contraseña incorrectos.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error al iniciar sesión.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// MOSTRAR SISTEMA
// =====================================

function mostrarSistema(datos){

  document.getElementById('loginContainer').style.display = 'none';

  document.getElementById('sistema').style.display = 'block';

  cargarGrupos();
  cargarGruposFiltroPDF();
  cargarHistorialPDF();
  cargarDiasEstadisticas();

  if(document.getElementById('panelAdmin')){

    if(datos.rol === 'ADMINISTRADOR'){

      document.getElementById('panelAdmin').style.display = 'block';

    }else{

      document.getElementById('panelAdmin').style.display = 'none';
    }
  }
}

// =====================================
// CARGAR GRUPOS
// =====================================

function cargarGrupos(){

  const select =
    document.getElementById('grupo');

  select.innerHTML = '';

  if(gruposPermitidos.includes('TODOS')){

    cargarTodosLosGrupos();

    return;
  }

  gruposPermitidos.forEach(grupo => {

    let option =
      document.createElement('option');

    option.value = grupo;

    option.textContent = grupo;

    select.appendChild(option);
  });
}

// =====================================
// TODOS LOS GRUPOS
// =====================================

async function cargarTodosLosGrupos(){

  try{

    const respuesta =
      await fetch(
        API + '?accion=grupos'
      );

    const grupos =
      await respuesta.json();

    const select =
      document.getElementById('grupo');

    select.innerHTML = '';

    grupos.forEach(grupo => {

      let option =
        document.createElement('option');

      option.value = grupo;

      option.textContent = grupo;

      select.appendChild(option);
    });

  }catch(error){

    console.error(error);
  }
}

// =====================================
// GENERAR LISTA
// =====================================

async function generar(){

  mostrarLoader(
    'Generando lista de asistencia...'
  );

  try{

    const grupo =
      document.getElementById('grupo').value;

    if(!grupo){

      mostrarMensajeSistema(
        'Selecciona un grupo.',
        'info'
      );

      return;
    }

    document.getElementById('grupoPDF').textContent = grupo;

    document.getElementById('fechaPDF').textContent =
      new Date().toLocaleDateString();

    const respuesta =
      await fetch(
        API +
        '?accion=lista&grupo=' +
        encodeURIComponent(grupo)
      );

    const datos =
      await respuesta.json();

    console.log(datos);

mostrarTabla(datos);

const buscador =
  document.getElementById('busqueda');

if(buscador){
  buscador.value = '';
}

document
  .getElementById('btnGenerarPDF')
  .classList.remove('oculto');

// =====================================
// REGISTRAR LISTA EN HISTORIAL
// =====================================

const usuarioActivo =
  JSON.parse(
    localStorage.getItem('usuarioActivo')
  );

console.log(datos);

mostrarTabla(datos);

document.getElementById('btnGenerarPDF').style.display = 'inline-block';

mostrarMensajeSistema(
  'Lista generada correctamente.',
  'exito'
);

// ACTUALIZAR HISTORIAL
cargarHistorialPDF();

// MENSAJE FINAL
mostrarMensajeSistema(
  'Lista generada correctamente.',
  'exito'
);


  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error generando lista.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// MOSTRAR TABLA
// =====================================

function mostrarTabla(datos){

  let html = '';

  let totalAsistenciasGlobal = 0;
  let totalFaltasGlobal = 0;
  let totalAlumnosActivos = 0;

  html += `
    <table>
      <tr>
        <th>#</th>
        <th>Alumno</th>
  `;

  datos.dias.forEach(dia => {
    html += `<th>${dia}</th>`;
  });

  html += `
        <th>Asist</th>
        <th>Faltas</th>
        <th>%</th>
      </tr>
  `;

  datos.alumnos.forEach((alumno,index)=>{

    const esBaja =
      alumno.includes('(BAJA)') ||
      alumno.includes('(BAJA_ACADEMICA)') ||
      alumno.includes('(BAJA_DEFINITIVA)');

    if(!esBaja){
      totalAlumnosActivos++;
    }

    let asistencias = 0;
    let faltas = 0;

    html += `
      <tr class="${esBaja ? 'fila-baja' : ''}">
        <td>${index + 1}</td>
        <td class="nombre">${alumno}</td>
    `;

    datos.dias.forEach(dia => {

      if(esBaja){

        html += `
          <td class="baja">
            -
          </td>
        `;

        return;
      }

      let valor = 'F';
      let clase = 'falta';

      if(
        datos.asistencia[alumno] &&
        datos.asistencia[alumno][dia]
      ){

        let estado =
          String(datos.asistencia[alumno][dia])
          .toUpperCase()
          .trim();

        if(
          estado === 'ASISTENCIA' ||
          estado === 'PRESENTE' ||
          estado === 'ASISTIO' ||
          estado === 'ASISTIÓ'
        ){

          valor = 'A';
          clase = 'presente';
          asistencias++;
          totalAsistenciasGlobal++;

        }else{

          faltas++;
          totalFaltasGlobal++;
        }

      }else{

        faltas++;
        totalFaltasGlobal++;
      }

      html += `
        <td class="${clase}">
          ${valor}
        </td>
      `;
    });

    if(esBaja){

      html += `
          <td class="asistencias">-</td>
          <td class="faltas">-</td>
          <td class="porcentaje">BAJA</td>
        </tr>
      `;

      return;
    }

    let total =
      asistencias + faltas;

    let porcentaje =
      total > 0
      ? Math.round((asistencias / total) * 100)
      : 0;

    html += `
        <td class="asistencias">${asistencias}</td>
        <td class="faltas">${faltas}</td>
        <td class="porcentaje">${porcentaje}%</td>
      </tr>
    `;
  });

  html += '</table>';

  document.getElementById('resultado').innerHTML = html;

  document.getElementById('totalAlumnos').textContent =
    totalAlumnosActivos;

  document.getElementById('totalAsistencias').textContent =
    totalAsistenciasGlobal;

  document.getElementById('totalFaltas').textContent =
    totalFaltasGlobal;

  let totalGeneral =
    totalAsistenciasGlobal + totalFaltasGlobal;

  let promedioGeneral =
    totalGeneral > 0
    ? Math.round((totalAsistenciasGlobal / totalGeneral) * 100)
    : 0;

  document.getElementById('promedioGrupo').textContent =
    promedioGeneral + '%';
}

// =====================================
// BUSCADOR
// =====================================

function filtrarAlumnosMultiple(){

  const input =
    document.getElementById('busqueda');

  if(!input){
    return;
  }

  const texto =
    input.value
      .toUpperCase()
      .trim();

  const tabla =
    document.querySelector('#resultado table');

  if(!tabla){
    return;
  }

  const filtros =
    texto
      .split(',')
      .map(filtro => filtro.trim())
      .filter(filtro => filtro !== '');

  const filas =
    tabla.getElementsByTagName('tr');

  for(let i = 1; i < filas.length; i++){

    const tdNombre =
      filas[i].getElementsByTagName('td')[1];

    if(!tdNombre){
      continue;
    }

    const nombreAlumno =
      tdNombre.textContent
        .toUpperCase()
        .trim();

    if(filtros.length === 0){

      filas[i].style.display = '';

    }else{

      const coincide =
        filtros.some(filtro =>
          nombreAlumno.includes(filtro)
        );

      filas[i].style.display =
        coincide ? '' : 'none';
    }
  }
}




// =====================================
// MODAL GLOBAL
// =====================================

function mostrarModalConfirmacion(titulo, mensaje){

  return new Promise(resolve => {

    const modal =
      document.getElementById('modalGlobal');

    const modalTitulo =
      document.getElementById('modalTitulo');

    const modalMensaje =
      document.getElementById('modalMensaje');

    const btnAceptar =
      document.getElementById('btnModalAceptar');

    const btnCancelar =
      document.getElementById('btnModalCancelar');

    if(!modal || !btnAceptar || !btnCancelar){
      resolve(false);
      return;
    }

    modalTitulo.textContent = titulo;
    modalMensaje.textContent = mensaje;

    modal.style.display = 'flex';

    btnAceptar.onclick = function(){
      modal.style.display = 'none';
      resolve(true);
    };

    btnCancelar.onclick = function(){
      modal.style.display = 'none';
      resolve(false);
    };
  });
}





// =====================================
// PDF
// =====================================

async function generarPDF(){

  let elementosNoPDF = [];
  let reporte = null;

  const botonPDF =
    document.getElementById('btnGenerarPDF');

  if(botonPDF){

    botonPDF.disabled = true;

    botonPDF.textContent =
      'GENERANDO PDF...';
  }

  mostrarLoader(
    'Generando PDF Académico...'
  );

  try{

    const grupo =
      document.getElementById('grupo').value;

    const usuarioActivo =
      JSON.parse(
        localStorage.getItem('usuarioActivo')
      );

    if(!grupo){
      mostrarMensajeSistema(
  'Selecciona un grupo.',
  'info'
);
      return;
    }

    const tabla =
      document.querySelector('#resultado table');

    if(!tabla){
      mostrarMensajeSistema(
  'Primero genera la lista.',
  'info'
);
      return;
    }

    const verificar =
      await fetch(
        API +
        '?accion=verificarPDF' +
        '&grupo=' +
        encodeURIComponent(grupo)
      );

    const existente =
      await verificar.json();

    if(existente.existe){

      const abrirPDF =
  await mostrarModalConfirmacion(

    'PDF existente',

    'Este PDF ya fue generado anteriormente. ¿Deseas abrir el PDF existente?'

  );

      if(abrirPDF){

        window.open(
          existente.url,
          '_blank'
        );
      }

      return;
    }

    const respuestaFolio =
  await fetch(
    API +
    '?accion=generarFolioTemporalPDF&tipo=GRUPAL'
  );

    const datosFolio =
      await respuestaFolio.json();

    const folio =
      datosFolio.folio;

    generarQRValidacion(folio);

    document.querySelectorAll('table tr')
      .forEach(fila => {
        fila.style.display = '';
      });

    document.getElementById('busqueda').value = '';

    reporte =
      document.getElementById('reporte');

    elementosNoPDF =
      Array.from(
        document.querySelectorAll('.no-pdf')
      );

    elementosNoPDF.forEach(elemento => {

      elemento.dataset.displayOriginal =
        elemento.style.display;

      elemento.style.display = 'none';
    });
    document.getElementById('dashboardPrincipal').style.display = 'none';
    reporte.classList.add('modo-pdf');

    await new Promise(resolve =>
      setTimeout(resolve,500)
    );

    const opciones = {

      margin:0.2,

      filename:
        'Lista_' +
        grupo +
        '.pdf',

      image:{
        type:'jpeg',
        quality:1
      },

      html2canvas:{
        scale:2,
        useCORS:true,
        scrollX:0,
        scrollY:0
      },

      jsPDF:{
        unit:'in',
        format:'letter',
        orientation:'portrait'
      },

      pagebreak:{
        mode:['css','legacy']
      }
    };

    mostrarMensajeSistema(
  'Generando PDF...',
  'info'
);

    const dataUri =
      await html2pdf()
        .set(opciones)
        .from(reporte)
        .outputPdf('datauristring');

    reporte.classList.remove('modo-pdf');
    document.getElementById('dashboardPrincipal').style.display = '';

    elementosNoPDF.forEach(elemento => {

      elemento.style.display =
        elemento.dataset.displayOriginal || '';
    });

    const base64 =
      dataUri.split(',')[1];

    const respuesta =
      await fetch(API,{
        method:'POST',
        redirect:'follow',
        body:JSON.stringify({
          accion:'guardarPDFBase64',
          grupo:grupo,
          docente:usuarioActivo.nombre,
          usuario:usuarioActivo.nombre,
          folio:folio,
          base64:base64
        })
      });

    const datos =
      await respuesta.json();

    mostrarMensajeSistema(
  'PDF generado y guardado correctamente.',
  'exito'
);

    window.open(
      datos.url,
      '_blank'
    );

    cargarHistorialPDF();

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
  'Error generando PDF. Revisa la consola.',
  'error'
);

}finally{

  if(reporte){
    reporte.classList.remove('modo-pdf');
    document.getElementById('dashboardPrincipal').style.display = '';
  }

  elementosNoPDF.forEach(elemento => {

    elemento.style.display =
      elemento.dataset.displayOriginal || '';
  });

if(botonPDF){

  botonPDF.disabled = false;

  botonPDF.textContent =
    'GENERAR PDF';
}

ocultarLoader();

}
}
// =====================================
// CERRAR SESIÓN
// =====================================

function cerrarSesion(){

  localStorage.removeItem('usuarioActivo');

  gruposPermitidos = [];

  document.getElementById('resultado').innerHTML = '';

  document.getElementById('grupoPDF').textContent = 'GRUPO';
  document.getElementById('fechaPDF').textContent = 'FECHA';
  document.getElementById('btnGenerarPDF').classList.add('oculto');

  document.getElementById('totalAlumnos').textContent = '0';
  document.getElementById('totalAsistencias').textContent = '0';
  document.getElementById('totalFaltas').textContent = '0';
  document.getElementById('promedioGrupo').textContent = '0%';

  document.getElementById('busqueda').value = '';
  document.getElementById('grupo').innerHTML =
    '<option>Cargando grupos...</option>';

  document.getElementById('usuario').value = '';
  document.getElementById('password').value = '';
  document.getElementById('mensajeLogin').textContent = '';

  if(document.getElementById('panelAdmin')){

    document.getElementById('panelAdmin').style.display = 'none';
  }

  document.getElementById('loginContainer').style.display = 'flex';

  document.getElementById('sistema').style.display = 'none';
}

// =====================================
// VERIFICAR SESIÓN
// =====================================

function verificarSesion(){

  const sesion =
    localStorage.getItem('usuarioActivo');

  if(!sesion){
    return;
  }

  const datos =
    JSON.parse(sesion);

  gruposPermitidos =
    Array.isArray(datos.grupos)
    ? datos.grupos
    : [];

  mostrarSistema(datos);
}

// =====================================
// INICIAR APP
// =====================================

document.addEventListener('DOMContentLoaded', function(){

  const sistema =
    document.getElementById('sistema');

  const panelAdmin =
    document.getElementById('panelAdmin');

  if(sistema){
    sistema.style.display = 'none';
    verificarSesion();
  }

  if(panelAdmin){
    panelAdmin.style.display = 'none';
  }

});


function mostrarFormularioDocente(){

  document.getElementById('formDocente')
    .style.display = 'block';
}

function ocultarFormularioDocente(){

  document.getElementById('formDocente')
    .style.display = 'none';

  document.getElementById('mensajeDocente')
    .textContent = '';
}

async function guardarDocente(){

  const usuario =
    document.getElementById('nuevoUsuario').value.trim();

  const password =
    document.getElementById('nuevoPassword').value.trim();

  const nombre =
    document.getElementById('nuevoNombre').value.trim();

  const grupos =
    document.getElementById('nuevoGrupos').value.trim();

  if(!usuario || !password || !nombre || !grupos){

    mostrarMensajeSistema(
      'Completa todos los campos.',
      'info'
    );

    return;
  }

  mostrarLoader(
    'Guardando docente...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=crearDocente' +
        '&usuario=' + encodeURIComponent(usuario) +
        '&password=' + encodeURIComponent(password) +
        '&nombre=' + encodeURIComponent(nombre) +
        '&grupos=' + encodeURIComponent(grupos)
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Docente creado correctamente.',
        'exito'
      );

      document.getElementById('nuevoUsuario').value = '';
      document.getElementById('nuevoPassword').value = '';
      document.getElementById('nuevoNombre').value = '';
      document.getElementById('nuevoGrupos').value = '';

    }else{

      mostrarMensajeSistema(
        'Error al crear docente.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error de conexión al crear docente.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}


function mostrarFormularioAlumno(){

  document.getElementById('formAlumno')
    .style.display = 'block';
}

function ocultarFormularioAlumno(){

  document.getElementById('formAlumno')
    .style.display = 'none';

  document.getElementById('mensajeAlumno')
    .textContent = '';
}

async function guardarAlumno(){

  const uid =
    document.getElementById('nuevoUID').value.trim();

  const nombre =
    document.getElementById('nuevoAlumno').value.trim();

  const grado =
    document.getElementById('nuevoGrado').value;

  const grupo =
    document.getElementById('nuevoGrupo').value;

  if(!uid || !nombre || !grado || !grupo){

    mostrarMensajeSistema(
      'Completa todos los campos.',
      'info'
    );

    return;
  }

  mostrarLoader(
    'Registrando alumno...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=crearAlumno' +
        '&uid=' + encodeURIComponent(uid) +
        '&nombre=' + encodeURIComponent(nombre) +
        '&grado=' + encodeURIComponent(grado) +
        '&grupo=' + encodeURIComponent(grupo) +
        '&usuario=' + encodeURIComponent(usuarioActual)
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Alumno registrado correctamente.',
        'exito'
      );

      document.getElementById('nuevoUID').value = '';
      document.getElementById('nuevoAlumno').value = '';
      document.getElementById('nuevoGrado').value = '';
      document.getElementById('nuevoGrupo').value = '';

    }else{

      mostrarMensajeSistema(
        'Error al registrar alumno.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error de conexión al registrar alumno.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}


function mostrarPanelAlumnos(){
  document.getElementById('panelAlumnos').style.display = 'block';
}

function ocultarPanelAlumnos(){
  document.getElementById('panelAlumnos').style.display = 'none';
  document.getElementById('resultadoBusquedaAlumno').innerHTML = '';
}

async function buscarAlumnoAdmin(){

  const busqueda =
    document.getElementById('buscarAlumno').value.trim();

  if(!busqueda){

    mostrarMensajeSistema(
      'Escribe un nombre o UID.',
      'info'
    );

    return;
  }

  mostrarLoader(
    'Buscando alumno...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=buscarAlumno' +
        '&busqueda=' + encodeURIComponent(busqueda)
      );

    const alumnos =
      await respuesta.json();

    let html = '';

    alumnos.forEach(alumno => {

      html += `
        <div class="resultado-alumno">

          <input value="${alumno.uid}" id="uid_${alumno.fila}">
          <input value="${alumno.nombre}" id="nombre_${alumno.fila}">

          <select id="grado_${alumno.fila}">
            <option ${alumno.grado=='Primero'?'selected':''}>Primero</option>
            <option ${alumno.grado=='Segundo'?'selected':''}>Segundo</option>
            <option ${alumno.grado=='Tercero'?'selected':''}>Tercero</option>
          </select>

          <select id="grupo_${alumno.fila}">
            <option ${alumno.grupo=='A'?'selected':''}>A</option>
            <option ${alumno.grupo=='B'?'selected':''}>B</option>
            <option ${alumno.grupo=='C'?'selected':''}>C</option>
          </select>

          <select id="estatus_${alumno.fila}">
            <option ${alumno.estatus=='ACTIVO'?'selected':''}>ACTIVO</option>
            <option ${alumno.estatus=='ALTA'?'selected':''}>ALTA</option>
            <option ${alumno.estatus=='BAJA'?'selected':''}>BAJA</option>
          </select>

          <button onclick="actualizarEstatusAlumno('${alumno.uid}', ${alumno.fila})">
            Actualizar estatus
          </button>

          <button onclick="editarAlumno(${alumno.fila})">
            Guardar cambios
          </button>

          <button onclick="registrarBajaFormal('${alumno.uid}')">
            Registrar baja formal
          </button>

          <button onclick="eliminarAlumno(${alumno.fila})">
            Eliminar
          </button>

          <div class="bloque-tutor-admin">

  <h4>Datos del tutor</h4>

  <input
    value="${alumno.nombreTutor || ''}"
    id="nombreTutor_${alumno.uid}"
    placeholder="Nombre del tutor">

  <input
    value="${alumno.telefonoTutor || ''}"
    id="telefonoTutor_${alumno.uid}"
    placeholder="Teléfono del tutor">

  <input
    value="${alumno.correoTutor || ''}"
    id="correoTutor_${alumno.uid}"
    placeholder="Correo del tutor">

  <button onclick="actualizarDatosTutorAdmin('${alumno.uid}')">
    Guardar tutor
  </button>

</div>




        </div>
      `;
    });

    document.getElementById(
      'resultadoBusquedaAlumno'
    ).innerHTML =
      html || 'No se encontraron alumnos';

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error buscando alumnos.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

async function editarAlumno(fila){

  const uid =
    document.getElementById('uid_' + fila).value;

  const nombre =
    document.getElementById('nombre_' + fila).value;

  const grado =
    document.getElementById('grado_' + fila).value;

  const grupo =
    document.getElementById('grupo_' + fila).value;

  mostrarLoader(
    'Guardando cambios del alumno...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=editarAlumno' +
        '&fila=' + fila +
        '&uid=' + encodeURIComponent(uid) +
        '&nombre=' + encodeURIComponent(nombre) +
        '&grado=' + encodeURIComponent(grado) +
        '&grupo=' + encodeURIComponent(grupo)
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Alumno actualizado correctamente.',
        'exito'
      );

    }else{

      mostrarMensajeSistema(
        'No se pudo actualizar el alumno.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error de conexión al actualizar alumno.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}


async function eliminarAlumno(fila){

  const confirmar =
    await mostrarModalConfirmacion(
      'Eliminar alumno',
      '¿Seguro que deseas eliminar este alumno? Esta acción no se puede deshacer.'
    );

  if(!confirmar){
    return;
  }

  mostrarLoader(
    'Eliminando alumno...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=eliminarAlumno' +
        '&fila=' + fila
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Alumno eliminado correctamente.',
        'exito'
      );

      buscarAlumnoAdmin();

    }else{

      mostrarMensajeSistema(
        'No se pudo eliminar el alumno.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error de conexión al eliminar alumno.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

function toggleEstadisticasGlobales(){

  const panel =
    document.getElementById(
      'panelEstadisticas'
    );

  if(
    panel.style.display === 'none' ||
    panel.style.display === ''
  ){

    panel.style.display = 'block';

  }else{

    panel.style.display = 'none';
  }
}

function ocultarPanelEstadisticas(){

  document
    .getElementById('panelEstadisticas')
    .style.display = 'none';
}

function toggleGraficas(){

  const contenedor =
    document.getElementById('contenedorGraficas');

  if(!contenedor){
    mostrarMensajeSistema(
      'No se encontró el contenedor de gráficas.',
      'error'
    );
    return;
  }

  if(
    contenedor.style.display === 'none' ||
    contenedor.style.display === ''
  ){

    contenedor.style.display = 'grid';

    mostrarMensajeSistema(
      'Gráficas visibles.',
      'exito'
    );

  }else{

    contenedor.style.display = 'none';

    mostrarMensajeSistema(
      'Gráficas ocultas.',
      'info'
    );
  }
}


async function cargarDiasEstadisticas(){

  const select =
    document.getElementById('selectEstadisticasDia');

  if(!select){
    return;
  }

  try{

    const respuesta =
      await fetch(
        API + '?accion=diasEstadisticas'
      );

    const dias =
      await respuesta.json();

    select.innerHTML = `
      <option value="TODAS">Todas</option>
    `;

    dias.forEach(fecha => {

      const fechaTexto =
        new Date(fecha + 'T00:00:00')
          .toLocaleDateString('es-MX', {
            day:'2-digit',
            month:'long',
            year:'numeric'
          });

      select.innerHTML += `
        <option value="${fecha}">
          ${fechaTexto}
        </option>
      `;

    });

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error cargando días de estadísticas.',
      'error'
    );
  }
}


function cargarEstadisticasSeleccionadas(){

  const select =
    document.getElementById('selectEstadisticasDia');

  if(!select || select.value === 'TODAS'){

    cargarEstadisticasGlobales();

  }else{

    cargarEstadisticasPorDia(
      select.value
    );
  }
}


async function cargarEstadisticasPorDia(fecha){

  mostrarLoader(
    'Cargando estadísticas del día...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=estadisticasPorDia' +
        '&fecha=' +
        encodeURIComponent(fecha)
      );

    const datos =
      await respuesta.json();

    let html = `
      <div class="dashboard">

        <div class="card">
          <h3>Fecha</h3>
          <p>${new Date(datos.fecha + 'T00:00:00')
            .toLocaleDateString('es-MX')}</p>
        </div>

        <div class="card">
          <h3>Asistencias</h3>
          <p>${datos.asistencias}</p>
        </div>

        <div class="card">
          <h3>Faltas</h3>
          <p>${datos.faltas}</p>
        </div>

        <div class="card">
          <h3>Promedio del día</h3>
          <p>${datos.porcentaje}%</p>
        </div>

      </div>

      <div class="dashboard">

        <div class="card">
          <h3>Mayor asistencia</h3>
          <p>${datos.mayorGrupo || 'Sin datos'}</p>
        </div>

        <div class="card">
          <h3>Menor asistencia</h3>
          <p>${datos.menorGrupo || 'Sin datos'}</p>
        </div>

      </div>

      <h3>Resumen por grupo del día</h3>

      <table>
        <tr>
          <th>Grupo</th>
          <th>Asistencias</th>
          <th>Faltas</th>
          <th>%</th>
        </tr>
    `;

    Object.keys(datos.grupos).forEach(grupo => {

      html += `
        <tr>
          <td>${grupo}</td>
          <td>${datos.grupos[grupo].asistencias}</td>
          <td>${datos.grupos[grupo].faltas}</td>
          <td>${datos.grupos[grupo].porcentaje}%</td>
        </tr>
      `;
    });

    html += `</table>`;

    document.getElementById(
      'resultadoEstadisticasGlobales'
    ).innerHTML = html;

// =====================================
// ACTUALIZAR GRÁFICAS DEL DÍA
// =====================================

let nombresGrupos = [];
let porcentajes = [];

Object.keys(datos.grupos).forEach(grupo => {

  nombresGrupos.push(grupo);

  porcentajes.push(
    datos.grupos[grupo].porcentaje
  );
});

document.getElementById(
  'contenedorGraficas'
).style.display = 'grid';

if(graficaAsistencia){
  graficaAsistencia.destroy();
}

if(graficaGrupos){
  graficaGrupos.destroy();
}

const ctx1 =
  document.getElementById('graficaAsistencia');

graficaAsistencia =
  new Chart(ctx1, {
    type:'pie',
    data:{
      labels:['Asistencias','Faltas'],
      datasets:[{
        data:[
          datos.asistencias,
          datos.faltas
        ],
        backgroundColor:[
          '#4CAF50',
          '#F44336'
        ]
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false
    }
  });

const ctx2 =
  document.getElementById('graficaGrupos');

graficaGrupos =
  new Chart(ctx2, {
    type:'bar',
    data:{
      labels:nombresGrupos,
      datasets:[{
        label:'% Asistencia',
        data:porcentajes,
        backgroundColor:'#2196F3'
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{
          display:false
        }
      },
      scales:{
        y:{
          beginAtZero:true,
          max:100
        }
      }
    }
  });




    mostrarMensajeSistema(
      'Estadísticas del día cargadas correctamente.',
      'exito'
    );

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error cargando estadísticas del día.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}




async function cargarEstadisticasGlobales(){

  mostrarLoader('Cargando estadísticas globales...');

  try{

    const respuesta =
      await fetch(API + '?accion=estadisticasGlobales');

    const datos =
      await respuesta.json();

    let html = `
      <div class="dashboard">

        <div class="card">
          <h3>Total alumnos</h3>
          <p>${datos.alumnos}</p>
        </div>

          <div class="card">
          <h3>Asistencias</h3>
          <p>${datos.asistencias}</p>
        </div>

        <div class="card">
          <h3>Faltas</h3>
          <p>${datos.faltas}</p>
        </div>

        <div class="card">
          <h3>Promedio general</h3>
          <p>${datos.porcentaje}%</p>
        </div>

      </div>

      <h3>Resumen por grupo</h3>

      <table>
        <tr>
          <th>Grupo</th>
          <th>Asistencias</th>
          <th>Faltas</th>
          <th>%</th>
        </tr>
    `;

    let nombresGrupos = [];
    let porcentajes = [];

    Object.keys(datos.grupos).forEach(grupo => {

      let asist = datos.grupos[grupo].asistencias;
      let faltas = datos.grupos[grupo].faltas;
      let total = asist + faltas;

      let porcentaje =
        total > 0
        ? Math.round((asist / total) * 100)
        : 0;

      nombresGrupos.push(grupo);
      porcentajes.push(porcentaje);

      html += `
        <tr>
          <td>${grupo}</td>
          <td>${asist}</td>
          <td>${faltas}</td>
          <td>${porcentaje}%</td>
        </tr>
      `;
    });

    html += `</table>`;

    document.getElementById(
      'resultadoEstadisticasGlobales'
    ).innerHTML = html;

    document.getElementById(
      'contenedorGraficas'
    ).style.display = 'grid';

    if(graficaAsistencia){
      graficaAsistencia.destroy();
    }

    if(graficaGrupos){
      graficaGrupos.destroy();
    }

    const ctx1 =
      document.getElementById('graficaAsistencia');

    graficaAsistencia =
      new Chart(ctx1, {
        type:'pie',
        data:{
          labels:['Asistencias','Faltas'],
          datasets:[{
            data:[
              datos.asistencias,
              datos.faltas
            ],
            backgroundColor:[
              '#4CAF50',
              '#F44336'
            ]
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false
        }
      });

    const ctx2 =
      document.getElementById('graficaGrupos');

    graficaGrupos =
      new Chart(ctx2, {
        type:'bar',
        data:{
          labels:nombresGrupos,
          datasets:[{
            label:'% Asistencia',
            data:porcentajes,
            backgroundColor:'#2196F3'
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          plugins:{
            legend:{
              display:false
            }
          },
          scales:{
            y:{
              beginAtZero:true,
              max:100
            }
          }
        }
      });

    mostrarMensajeSistema(
      'Estadísticas actualizadas correctamente.',
      'exito'
    );

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error cargando estadísticas.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// MOSTRAR / OCULTAR ESTADÍSTICAS GLOBALES
// =====================================

function toggleEstadisticasGlobales(){

  const panel =
    document.getElementById('panelEstadisticas');

  if(!panel){
    console.error('No existe panelEstadisticas');
    return;
  }

  if(
    panel.style.display === 'none' ||
    panel.style.display === ''
  ){

    panel.style.display = 'block';

  }else{

    panel.style.display = 'none';
  }
}


// =====================================
// HISTORIAL PDF
// =====================================

async function cargarGruposFiltroPDF(){

  const usuario =
    JSON.parse(localStorage.getItem('usuarioActivo'));

  const select =
    document.getElementById('filtroGrupoPDF');

  if(!select || !usuario){
    return;
  }

  select.innerHTML = `
    <option value="">Todos los grupos</option>
  `;

  // Si es administrador y tiene TODOS, cargar grupos reales desde Apps Script
  if(usuario.grupos.includes('TODOS')){

    const respuesta =
      await fetch(
        API + '?accion=grupos'
      );

    const grupos =
      await respuesta.json();

    grupos.forEach(grupo => {

      select.innerHTML += `
        <option value="${grupo}">
          ${grupo}
        </option>
      `;

    });

    return;
  }

  // Si es docente, cargar solo sus grupos
  usuario.grupos.forEach(grupo => {

    select.innerHTML += `
      <option value="${grupo}">
        ${grupo}
      </option>
    `;

  });
}




function mostrarHistorialPDFGrupal(){

  tipoHistorialPDF = 'GRUPAL';

  cargarHistorialPDF();

  mostrarMensajeSistema(
    'Mostrando PDFs grupales.',
    'info'
  );
}

function mostrarHistorialPDFIndividual(){

  tipoHistorialPDF = 'INDIVIDUAL';

  cargarHistorialPDF();

  mostrarMensajeSistema(
    'Mostrando PDFs individuales.',
    'info'
  );
}

function mostrarMensajeSistema(texto, tipo = 'info'){

  const mensaje =
    document.getElementById('mensajeSistema');

  if(!mensaje){
    return;
  }

  mensaje.textContent = texto;

  mensaje.className =
    'mensaje-sistema mensaje-' + tipo;

  mensaje.style.display = 'block';

  setTimeout(function(){
    ocultarMensajeSistema();
  }, 3000);
}

function ocultarMensajeSistema(){

  const mensaje =
    document.getElementById('mensajeSistema');

  if(!mensaje){
    return;
  }

  mensaje.style.display = 'none';
  mensaje.textContent = '';
}


async function cargarHistorialPDF(){

  const usuario =
    JSON.parse(
      localStorage.getItem('usuarioActivo')
    );

  // ===== FILTROS DEL HISTORIAL =====
  const mes =
    document.getElementById('filtroMesPDF')?.value || '';

  const anio =
    document.getElementById('filtroAnioPDF')?.value || '';

  const grupo =
    document.getElementById('filtroGrupoPDF')?.value || '';

  const docente =
    document.getElementById('filtroDocentePDF')?.value || '';

  const folio =
    document.getElementById('filtroFolioPDF')?.value || '';

    mostrarMensajeSistema(
  'Cargando historial PDF...',
  'info'
);
    const respuesta =
    await fetch(

      API +

'?accion=obtenerHistorialPDF' +

'&tipoHistorial=' +
encodeURIComponent(tipoHistorialPDF) +

'&usuario=' +
encodeURIComponent(usuario.nombre) +

      '&rol=' +
      encodeURIComponent(usuario.rol) +

      '&grupos=' +
      encodeURIComponent(
        usuario.grupos.join(',')
      ) +

      '&mes=' +
      encodeURIComponent(mes) +

      '&anio=' +
      encodeURIComponent(anio) +

      '&grupo=' +
      encodeURIComponent(grupo) +

      '&docente=' +
      encodeURIComponent(docente) +

      '&folio=' +
      encodeURIComponent(folio)
    );

  const historial =
  await respuesta.json();

// =====================================
// RESUMEN HISTORIAL PDF
// =====================================

let ultimoPDF =
  historial.length > 0
  ? historial[0].archivo
  : 'Sin registros';

let resumenHTML = `
  <div class="card-resumen-pdf">

    <h3>Total PDFs</h3>

    <p>
      ${historial.length}
    </p>

  </div>

  <div class="card-resumen-pdf">

    <h3>Mes</h3>

    <p>
      ${mes || 'Todos'}
    </p>

  </div>

  <div class="card-resumen-pdf">

    <h3>Grupo</h3>

    <p>
      ${grupo || 'Todos'}
    </p>

  </div>

  <div class="card-resumen-pdf">

    <h3>Último PDF</h3>

    <p class="ultimo-pdf">
      ${ultimoPDF}
    </p>

  </div>
`;

document.getElementById(
  'resumenHistorialPDF'
).innerHTML = resumenHTML;

if(historial.length === 0){

  document.getElementById(
  'resultadoHistorialPDF'
).innerHTML = `
  
  <p class="mensaje-vacio">
    No se encontraron PDFs con los filtros seleccionados.
  </p>
`;

mostrarMensajeSistema(
  'No se encontraron PDFs con los filtros seleccionados.',
  'info'
);

setTimeout(function(){
  ocultarMensajeSistema();
}, 2500);

return;
}



  let html = `
    <table class="tabla-historial-pdf">
      <tr>
        <th>Folio</th>
        <th>Fecha</th>
        <th>Grupo</th>
        <th>Docente</th>
        <th>Archivo</th>
        <th>Abrir</th>
      </tr>
  `;

  historial.forEach(pdf => {

    html += `
      <tr>

        <td>
          ${pdf.folio || 'Sin folio'}
        </td>

        <td>
          ${new Date(pdf.fecha)
            .toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
        </td>

        <td>
          ${pdf.grupo}
        </td>

        <td>
          ${pdf.docente}
        </td>

        <td>
          ${pdf.archivo}
        </td>

        <td>

          <a
            class="btn-abrir-pdf"
            href="${pdf.url}"
            target="_blank">

            Abrir PDF

          </a>

        </td>

      </tr>
    `;
  });

  html += '</table>';

  document.getElementById(
  'resultadoHistorialPDF'
).innerHTML = html;

mostrarMensajeSistema(
  'Historial actualizado correctamente.',
  'exito'
);

setTimeout(function(){
  ocultarMensajeSistema();
}, 2500);

}

// =====================================
// GENERAR QR DE VALIDACIÓN PDF
// =====================================

function generarQRValidacion(folio){

  const contenedorQR =
    document.getElementById('qrValidacionPDF');

  if(!contenedorQR){
    console.error('No existe el contenedor qrValidacionPDF');
    return;
  }

  contenedorQR.innerHTML = '';

  const urlValidacion =
    'https://asistenciaaplicacion.github.io/sistema-asistencia-escolar/verificar.html?folio=' +
  encodeURIComponent(folio);

  new QRCode(contenedorQR, {
    text:urlValidacion,
    width:90,
    height:90,
    correctLevel:QRCode.CorrectLevel.H
  });

  const folioPDF =
    document.getElementById('folioPDF');

  if(folioPDF){
    folioPDF.textContent =
      'Folio: ' + folio;
  }

  const texto =
    document.getElementById('textoValidacionPDF');

  if(texto){
    texto.textContent =
      'Folio: ' + folio;
  }
}


// =====================================
// REPORTE INDIVIDUAL ALUMNO
// ETAPA 7.1
// =====================================

async function buscarReporteIndividual(){

  const busqueda =
    document.getElementById('busquedaIndividual').value.trim();

  if(!busqueda){

    mostrarMensajeSistema(
      'Escribe nombre, UID o grupo del alumno.',
      'info'
    );

    return;
  }

  mostrarLoader(
    'Buscando reporte individual...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=buscarReporteIndividual' +
        '&busqueda=' +
        encodeURIComponent(busqueda)
      );

    const datos =
      await respuesta.json();

    if(!datos || datos.length === 0){

      document.getElementById(
        'resultadoReporteIndividual'
      ).innerHTML = `
        <p class="mensaje-vacio">
          No se encontraron alumnos.
        </p>
      `;

      mostrarMensajeSistema(
        'No se encontraron resultados.',
        'info'
      );

      return;
    }

    mostrarResultadosIndividuales(datos);

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error buscando alumno.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}


function mostrarResultadosIndividuales(alumnos){

  let html = `
    <div class="resultados-individuales">
  `;

  alumnos.forEach(alumno => {

    html += `
      <div class="card-individual">

        <h3>${alumno.nombre}</h3>

        <p><strong>UID:</strong> ${alumno.uid}</p>
        <p><strong>Grupo:</strong> ${alumno.grupo}</p>

        <button onclick="cargarHistorialIndividual('${alumno.uid}')">
          Ver historial
        </button>

      </div>
    `;
  });

  html += `</div>`;

  document.getElementById(
    'resultadoReporteIndividual'
  ).innerHTML = html;
}


function limpiarReporteIndividual(){

  document.getElementById('busquedaIndividual').value = '';

  document.getElementById(
    'resultadoReporteIndividual'
  ).innerHTML = '';
}


// =====================================
// HISTORIAL INDIVIDUAL
// =====================================



async function cargarHistorialIndividual(uid){

  mostrarLoader(
    'Cargando historial individual...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=historialIndividual' +
        '&uid=' +
        encodeURIComponent(uid)
      );

    const datos =
      await respuesta.json();

    console.log(
      'HISTORIAL INDIVIDUAL RECIBIDO:',
      datos
    );

    mostrarHistorialIndividual(datos);

    await cargarReportesAlumnoIndividual(
  uid,
  datos.nombre
);

await cargarJustificantesAlumnoIndividual(
  uid,
  datos.nombre
);

await cargarPasesSalidaAlumnoIndividual(
  uid,
  datos.nombre
);

await cargarCitatoriosAlumnoIndividual(
  uid,
  datos.nombre
);

await cargarSeguimientoTutorialReporteIndividual(uid);

await cargarCalificacionesReporteIndividual(uid);

mostrarMensajeSistema(
  'Historial individual cargado.',
  'exito'
);

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error cargando historial individual.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}


function mostrarHistorialIndividual(datos){

  const contenedor =
    document.getElementById('resultadoReporteIndividual');

  if(!contenedor){
    console.error('No existe resultadoReporteIndividual');
    return;
  }

  if(!datos){

    contenedor.innerHTML = `
      <p class="mensaje-vacio">
        No se recibieron datos del alumno.
      </p>
    `;

    return;
  }

  let historial =
    Array.isArray(datos.historial)
    ? datos.historial
    : [];

  const fechaInicio =
    document.getElementById('fechaInicioIndividual')?.value || '';

  const fechaFin =
    document.getElementById('fechaFinIndividual')?.value || '';

  if(fechaInicio || fechaFin){

    historial = historial.filter(registro => {

      if(!registro.fecha){
        return false;
      }

      const fechaRegistro =
        new Date(registro.fecha);

      if(isNaN(fechaRegistro.getTime())){
        return false;
      }

      const anio =
        fechaRegistro.getFullYear();

      const mes =
        String(fechaRegistro.getMonth() + 1).padStart(2, '0');

      const dia =
        String(fechaRegistro.getDate()).padStart(2, '0');

      const fechaClave =
        anio + '-' + mes + '-' + dia;

      if(fechaInicio && fechaClave < fechaInicio){
        return false;
      }

      if(fechaFin && fechaClave > fechaFin){
        return false;
      }

      return true;
    });
  }

  let asistenciasFiltradas = 0;
  let faltasFiltradas = 0;

  historial.forEach(registro => {

    const estado =
      String(registro.estado || '').toUpperCase();

    if(
      estado === 'ASISTENCIA' ||
      estado === 'PRESENTE' ||
      estado === 'ASISTIO' ||
      estado === 'ASISTIÓ'
    ){
      asistenciasFiltradas++;
    }else{
      faltasFiltradas++;
    }
  });

  const totalFiltrado =
    asistenciasFiltradas + faltasFiltradas;

  const promedioFiltrado =
    totalFiltrado > 0
    ? Math.round((asistenciasFiltradas / totalFiltrado) * 100)
    : 0;

  let html = `
    <div class="dashboard">

      <div class="card">
        <h3>Alumno</h3>
        <p style="font-size:18px;">
          ${datos.nombre || 'Sin nombre'}
        </p>
      </div>

      <div class="card">
        <h3>Grupo</h3>
        <p>
          ${datos.grado || ''} ${datos.grupo || ''}
        </p>
      </div>

      <div class="card">
        <h3>Asistencias</h3>
        <p>${asistenciasFiltradas}</p>
      </div>

      <div class="card">
        <h3>Faltas</h3>
        <p>${faltasFiltradas}</p>
      </div>

      <div class="card">
        <h3>Promedio</h3>
        <p>${promedioFiltrado}%</p>
      </div>

    </div>

    <h3>Historial por fechas</h3>

    <p class="mensaje-vacio">
      ${
        fechaInicio || fechaFin
        ? 'Rango consultado: ' +
          (fechaInicio || 'inicio') +
          ' al ' +
          (fechaFin || 'actual')
        : 'Mostrando historial completo'
      }
    </p>
  `;

  if(historial.length === 0){

    html += `
      <p class="mensaje-vacio">
        No hay registros de asistencia en el rango seleccionado.
      </p>
    `;

  }else{

    html += `
      <table class="tabla-individual">
        <tr>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Estado</th>
          <th>Puntualidad</th>
        </tr>
    `;

    historial.forEach(registro => {

      const estado =
        String(registro.estado || '').toUpperCase();

      const clase =
        (
          estado === 'ASISTENCIA' ||
          estado === 'PRESENTE' ||
          estado === 'ASISTIO' ||
          estado === 'ASISTIÓ'
        )
        ? 'presente'
        : 'falta';

      let fechaTexto = 'Sin fecha';

      if(registro.fecha){
        fechaTexto =
          new Date(registro.fecha)
            .toLocaleDateString(
              'es-MX',
              {
                day:'2-digit',
                month:'2-digit',
                year:'numeric'
              }
            );
      }

      let horaTexto = 'N/D';

      if(registro.hora){

        const horaObj =
          new Date(registro.hora);

        horaTexto =
          isNaN(horaObj.getTime())
          ? 'S/I'
          : horaObj.toLocaleTimeString(
              'es-MX',
              {
                hour:'2-digit',
                minute:'2-digit',
                second:'2-digit'
              }
            );
      }

      html += `
        <tr>
          <td>${fechaTexto}</td>
          <td>${horaTexto}</td>
          <td class="${clase}">
            ${registro.estado || ''}
          </td>
          <td>${registro.puntualidad || ''}</td>
        </tr>
      `;
    });

    html += `</table>`;
  }

  contenedor.innerHTML = html;
}



function generarPDFIndividual(){

  const contenedor =
    document.getElementById('resultadoReporteIndividual');

  if(!contenedor || contenedor.innerHTML.trim() === ''){
    alert('Primero busca un alumno para generar su PDF individual.');
    return;
  }

  const tablas =
    contenedor.querySelectorAll('table');

  if(tablas.length === 0){
    alert('No se encontró la tabla del historial individual.');
    return;
  }

  const tablaHistorial =
    tablas[0].cloneNode(true);

  tablaHistorial.querySelectorAll('*').forEach(el => {
    el.removeAttribute('style');
    el.removeAttribute('class');
  });

  tablaHistorial.style.width = '100%';
  tablaHistorial.style.borderCollapse = 'collapse';
  tablaHistorial.style.tableLayout = 'fixed';

  function obtenerTablaPorTitulo(tituloBuscado){

    const titulos =
      contenedor.querySelectorAll('h3');

    for(let titulo of titulos){

      if(
        titulo.textContent
          .toUpperCase()
          .includes(tituloBuscado.toUpperCase())
      ){

        let elemento =
          titulo.nextElementSibling;

        while(elemento){

          if(elemento.tagName === 'TABLE'){
            return elemento;
          }

          const tabla =
            elemento.querySelector
            ? elemento.querySelector('table')
            : null;

          if(tabla){
            return tabla;
          }

          elemento =
            elemento.nextElementSibling;
        }
      }
    }

    return null;
  }

  function crearTarjetasDesdeTabla(tabla, campos){

    if(!tabla){
      return `
        <p style="font-size:12px;">
          Sin registros.
        </p>
      `;
    }

    const filas =
      tabla.querySelectorAll('tr');

    if(filas.length <= 1){
      return `
        <p style="font-size:12px;">
          Sin registros.
        </p>
      `;
    }

    let html = '';

    for(let i = 1; i < filas.length; i++){

      const celdas =
        filas[i].querySelectorAll('td');

      html += `
        <div class="tarjeta-reporte-pdf">
      `;

      campos.forEach(campo => {

        html += `
          <p>
            <strong>${campo.titulo}:</strong>
            ${celdas[campo.indice]?.innerText || ''}
          </p>
        `;
      });

      html += `
        </div>
      `;
    }

    return html;
  }

  const tablaReportes =
  document.getElementById('tablaReportesIndividual');

const tablaJustificantes =
  document.getElementById('tablaJustificantesIndividual');

const tablaPases =
  document.getElementById('tablaPasesIndividual');

const tablaCitatorios =
  document.getElementById('tablaCitatoriosIndividual');

  const tablaCalificaciones =
  document.getElementById('tablaCalificacionesIndividual'); 
  
  const tablaSeguimientoTutorial =
  document.getElementById('tablaSeguimientoTutorialIndividual');

  const alertaIntegral =
  document.querySelector('#resultadoReporteIndividual .alerta-riesgo');

  const htmlReportes =
    crearTarjetasDesdeTabla(
      tablaReportes,
      [
        { titulo:'Fecha', indice:0 },
        { titulo:'Tipo', indice:1 },
        { titulo:'Docente', indice:2 },
        { titulo:'Descripción', indice:3 },
        { titulo:'Acción tomada', indice:4 }
      ]
    );

    let htmlCalificaciones = '';

    let htmlAlertaIntegral = '';

if(alertaIntegral){

  const alertaClon =
    alertaIntegral.cloneNode(true);

  alertaClon.querySelectorAll('*').forEach(el => {
    el.removeAttribute('style');
  });

  htmlAlertaIntegral =
    alertaClon.outerHTML;

}

if(tablaCalificaciones){

  const tablaClon =
    tablaCalificaciones.cloneNode(true);

  tablaClon.querySelectorAll('*').forEach(el => {
    el.removeAttribute('style');
    el.removeAttribute('class');
  });

  htmlCalificaciones =
    tablaClon.outerHTML;

}else{

  htmlCalificaciones =
    '<p style="font-size:12px;">Sin calificaciones registradas.</p>';

}

  const htmlJustificantes =
    crearTarjetasDesdeTabla(
      tablaJustificantes,
      [
        { titulo:'Fecha', indice:0 },
        { titulo:'Tipo', indice:1 },
        { titulo:'Solicita', indice:2 },
        { titulo:'Motivo', indice:3 },
        { titulo:'Registró', indice:4 }
      ]
    );

  const htmlPases =
    crearTarjetasDesdeTabla(
      tablaPases,
      [
        { titulo:'Fecha', indice:0 },
        { titulo:'Hora salida', indice:1 },
        { titulo:'Motivo', indice:2 },
        { titulo:'Recoge', indice:3 },
        { titulo:'Autoriza', indice:4 },
        { titulo:'Folio', indice:5 }
      ]
    );

  const htmlCitatorios =
    crearTarjetasDesdeTabla(
      tablaCitatorios,
      [
        { titulo:'Fecha registro', indice:0 },
        { titulo:'Alumno', indice:1 },
        { titulo:'Grado', indice:2 },
        { titulo:'Grupo', indice:3 },
        { titulo:'Fecha citatorio', indice:4 },
        { titulo:'Hora citatorio', indice:5 },
        { titulo:'Motivo', indice:6 },
        { titulo:'Observaciones', indice:7 },
        { titulo:'Registrado por', indice:8 },
        { titulo:'Seguimiento', indice:9 }
      ]
    );

    const htmlSeguimientoTutorial =
  crearTarjetasDesdeTabla(
    tablaSeguimientoTutorial,
    [
      { titulo:'Fecha', indice:0 },
      { titulo:'Responsable', indice:1 },
      { titulo:'Acción', indice:2 },
      { titulo:'Próxima revisión', indice:3 },
      { titulo:'Seguimiento posterior', indice:4 }
    ]
  );

  const texto =
    contenedor.innerText;

  const alumno =
    texto.match(/Alumno\s+(.+)/)?.[1] ||
    contenedor.querySelector('h3')?.innerText ||
    'Alumno individual';

  const grupo =
    texto.match(/Grupo\s+(.+)/)?.[1] ||
    'Grupo individual';

  const fechaEmision =
    new Date().toLocaleDateString('es-MX');

  const folio =
    'IND-' + Date.now();

  const reporte =
    document.createElement('div');

  reporte.id =
    'contenedorTemporalPDFIndividual';

  reporte.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: 1100px;
    background: white;
    z-index: -9999;
    pointer-events: none;
  `;

  reporte.innerHTML = `
    <div id="pdfIndividual">

      <style>
        #pdfIndividual{
          font-family: Arial, sans-serif;
          padding: 14px;
          color: #1f2937;
          background: white;
        }

        .encabezado-individual{
          display:flex;
          align-items:center;
          border-bottom:4px solid #1565c0;
          padding-bottom:12px;
          margin-bottom:18px;
        }

        .logo-individual{
          width:80px;
          height:80px;
          object-fit:contain;
          margin-right:18px;
        }

        .titulo-individual h1{
          margin:0;
          color:#1565c0;
          font-size:21px;
        }

        .titulo-individual h2{
          margin:4px 0;
          font-size:16px;
        }

        .titulo-individual p{
          margin:0;
          font-size:12px;
        }

        #pdfIndividual h3{
          color:#1565c0;
          font-size:16px;
          margin:16px 0 8px;
        }

        #pdfIndividual table{
          width:100% !important;
          border-collapse:collapse !important;
          table-layout:fixed !important;
          font-size:9px !important;
        }

        #pdfIndividual th{
          background:#1565c0 !important;
          color:white !important;
          padding:5px 3px !important;
          border:1px solid #0d47a1 !important;
          text-align:center !important;
          font-size:9px !important;
        }

        #pdfIndividual td{
          padding:5px 3px !important;
          border:1px solid #cbd5e1 !important;
          text-align:center !important;
          font-size:9px !important;
          word-break:break-word !important;
        }

        .tarjeta-reporte-pdf{
          border:1px solid #cbd5e1;
          border-radius:8px;
          padding:8px;
          margin:0 1% 8px 0;
          font-size:10px;
          page-break-inside:avoid;
          break-inside:avoid;
          display:inline-block;
          width:47%;
          vertical-align:top;
          box-sizing:border-box;
        }

        .tarjeta-reporte-pdf p{
          margin:4px 0;
        }

        .validacion-individual{
          margin-top:22px;
          padding-top:14px;
          border-top:3px solid #1565c0;
          display:flex;
          justify-content:space-between;
          align-items:center;
        }

        .validacion-individual p{
          font-size:12px;
          margin:5px 0;
        }

        #qrPDFIndividual{
          width:105px;
          height:105px;
        }
      </style>

      <div class="encabezado-individual">

        <img src="logo.png" class="logo-individual">

        <div class="titulo-individual">
          <h1>SISTEMA DE ASISTENCIA ESCOLAR</h1>
          <h2>Reporte Individual Integral</h2>
          <p>
            Fecha de emisión: ${fechaEmision}<br>
            Folio: ${folio}
          </p>
        </div>

      </div>

      <h3>Historial de asistencia</h3>

      <div id="tablaPDFIndividual"></div>

      <h3>Alerta integral del alumno</h3>

      <div id="alertaIntegralPDFIndividual">
        ${htmlAlertaIntegral}
      </div>

      <h3>Calificaciones</h3>

      <div id="calificacionesPDFIndividual">
        ${htmlCalificaciones}
      </div>

      <h3>Reportes escolares</h3>

      <div id="reportesPDFIndividual">
        ${htmlReportes}
      </div>

      <h3>Justificantes escolares</h3>

      <div id="justificantesPDFIndividual">
        ${htmlJustificantes}
      </div>

      <h3>Pases de salida</h3>

      <div id="pasesPDFIndividual">
        ${htmlPases}
      </div>

      <h3>Citatorios escolares</h3>

      <div id="citatoriosPDFIndividual">
        ${htmlCitatorios}
      </div>

      <h3>Seguimiento tutorial</h3>

        <div id="seguimientoTutorialPDFIndividual">
          ${htmlSeguimientoTutorial}
        </div>

      <div class="validacion-individual">

        <div>
          <h3>Validación del documento</h3>
          <p>Este documento pertenece al expediente escolar digital.</p>
          <p>Folio: ${folio}</p>
        </div>

        <div id="qrPDFIndividual"></div>

      </div>

    </div>
  `;

  document.body.appendChild(reporte);

  reporte
    .querySelector('#tablaPDFIndividual')
    .appendChild(tablaHistorial);

  const urlValidacion =
    'https://asistenciaaplicacion.github.io/sistema-asistencia-escolar/verificar.html?folio=' +
    encodeURIComponent(folio);

  new QRCode(
    reporte.querySelector('#qrPDFIndividual'),
    {
      text:urlValidacion,
      width:105,
      height:105
    }
  );

  setTimeout(async () => {

    const opciones = {
      margin:[0.2, 0.2, 0.2, 0.2],
      filename:`Reporte_Individual_${folio}.pdf`,
      image:{
        type:'jpeg',
        quality:0.98
      },
      html2canvas:{
        scale:2,
        useCORS:true,
        scrollY:0
      },
      jsPDF:{
        unit:'in',
        format:'letter',
        orientation:'landscape'
      },
      pagebreak:{
        mode:['avoid-all', 'css', 'legacy']
      }
    };

    try{

      mostrarLoader('Guardando PDF individual en Drive...');

      const usuarioActivo =
        JSON.parse(
          localStorage.getItem('usuarioActivo')
        );

      const dataUri =
        await html2pdf()
          .set(opciones)
          .from(reporte.querySelector('#pdfIndividual'))
          .outputPdf('datauristring');

      const base64 =
        dataUri.split(',')[1];

      const respuesta =
        await fetch(API,{
          method:'POST',
          redirect:'follow',
          body:JSON.stringify({
            accion:'guardarPDFIndividualBase64',
            alumno:alumno,
            grupo:grupo,
            usuario:usuarioActivo.nombre,
            folio:folio,
            base64:base64
          })
        });

      const datos =
        await respuesta.json();

      if(datos.success){

        mostrarMensajeSistema(
          'PDF individual guardado correctamente.',
          'exito'
        );

        window.open(
          datos.url,
          '_blank'
        );

        cargarHistorialPDF();

      }else{

        mostrarMensajeSistema(
          'No se pudo guardar el PDF individual.',
          'error'
        );
      }

    }catch(error){

      console.error(error);

      mostrarMensajeSistema(
        'Error guardando PDF individual.',
        'error'
      );

    }finally{

      ocultarLoader();

      const temporal =
        document.getElementById(
          'contenedorTemporalPDFIndividual'
        );

      if(temporal){
        temporal.remove();
      }
    }

  }, 500);
}



async function registrarReporteAlumno(){

  const usuarioActivo =
    JSON.parse(
      localStorage.getItem('usuarioActivo')
    );

  if(!usuarioActivo){

    mostrarMensajeSistema(
      'No hay sesión activa.',
      'error'
    );

    return;
  }

  const uid =
    document.getElementById('reporteUID').value.trim();

  const alumno =
    document.getElementById('reporteAlumno').value.trim();

  const grado =
    document.getElementById('reporteGrado').value.trim();

  const grupo =
    document.getElementById('reporteGrupo').value.trim();

  const tipoReporte =
    document.getElementById('reporteTipo').value.trim();

  const descripcion =
    document.getElementById('reporteDescripcion').value.trim();

  const accionTomada =
    document.getElementById('reporteAccion').value.trim();

  if(
    !alumno ||
    !grado ||
    !grupo ||
    !tipoReporte ||
    !descripcion
  ){

    mostrarMensajeSistema(
      'Completa alumno, grado, grupo, tipo y descripción.',
      'info'
    );

    return;
  }

  mostrarLoader(
    'Guardando reporte...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=registrarReporteAlumno' +
        '&uid=' +
        encodeURIComponent(uid) +
        '&alumno=' +
        encodeURIComponent(alumno) +
        '&grado=' +
        encodeURIComponent(grado) +
        '&grupo=' +
        encodeURIComponent(grupo) +
        '&docente=' +
        encodeURIComponent(usuarioActivo.nombre) +
        '&tipoReporte=' +
        encodeURIComponent(tipoReporte) +
        '&descripcion=' +
        encodeURIComponent(descripcion) +
        '&accionTomada=' +
        encodeURIComponent(accionTomada)
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Reporte registrado correctamente.',
        'exito'
      );

      document.getElementById('reporteUID').value = '';
      document.getElementById('reporteAlumno').value = '';
      document.getElementById('reporteGrado').value = '';
      document.getElementById('reporteGrupo').value = '';
      document.getElementById('reporteTipo').value = '';
      document.getElementById('reporteDescripcion').value = '';
      document.getElementById('reporteAccion').value = '';

    }else{

      mostrarMensajeSistema(
        datos.mensaje || 'No se pudo registrar el reporte.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error de conexión al guardar reporte.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

function mostrarModuloAcademico(modulo){

  const contenedor =
    document.getElementById('contenedorModuloAcademico');

  if(!contenedor){
    mostrarMensajeSistema(
      'No se encontró el contenedor académico.',
      'error'
    );
    return;
  }

  if(modulo === 'reportes'){

   contenedor.innerHTML = `
  <div class="modulo-academico">

    <h3>Libro de reportes</h3>

    <p>
      Registra reportes escolares de conducta, incidencias u observaciones.
    </p>

    <input
      type="text"
      id="buscadorAlumnoReporte"
      placeholder="Buscar alumno: García, Guadalupe, López..."
      onkeyup="buscarAlumnoParaReporte()">

    <div id="resultadosAlumnoReporte" class="resultados-alumno-reporte"></div>

    <div class="form-grid">

      <input
        type="text"
        id="reporteUID"
        placeholder="UID del alumno"
        readonly>

      <input
        type="text"
        id="reporteAlumno"
        placeholder="Nombre del alumno"
        readonly>

      <input
        type="text"
        id="reporteGrado"
        placeholder="Grado"
        readonly>

      <input
        type="text"
        id="reporteGrupo"
        placeholder="Grupo"
        readonly>

      <select id="reporteTipo">
        <option value="">Tipo de reporte</option>
        <option>Conducta</option>
        <option>Incumplimiento de tareas</option>
        <option>Falta de respeto</option>
        <option>Uso indebido de celular</option>
        <option>Conflicto entre compañeros</option>
        <option>Daño a mobiliario</option>
        <option>Uniforme</option>
        <option>Otro</option>
      </select>

    </div>

    <textarea
      id="reporteDescripcion"
      placeholder="Descripción del reporte"
      rows="4"></textarea>

    <textarea
      id="reporteAccion"
      placeholder="Acción tomada"
      rows="3"></textarea>

    <button onclick="registrarReporteAlumno()">
      Guardar reporte
    </button>

  </div>
`;
    return;
  }

if(modulo === 'citatorios'){

  contenedor.innerHTML = `
    <div class="modulo-academico">

      <h3>Citatorios escolares</h3>

      <p>
        Registro institucional de citatorios.
      </p>

      <input
        type="text"
        id="buscadorAlumnoCitatorio"
        placeholder="Buscar alumno: García, Guadalupe, López..."
        onkeyup="buscarAlumnoParaCitatorio()">

      <div
        id="resultadosAlumnoCitatorio"
        class="resultados-alumno-reporte">
      </div>

      <div class="form-grid">

        <input
          type="text"
          id="citatorioUID"
          placeholder="UID"
          readonly>

        <input
          type="text"
          id="citatorioAlumno"
          placeholder="Alumno"
          readonly>

        <input
          type="text"
          id="citatorioGrado"
          placeholder="Grado"
          readonly>

        <input
          type="text"
          id="citatorioGrupo"
          placeholder="Grupo"
          readonly>

        <input
          type="date"
          id="fechaCitatorio">

        <input
          type="time"
          id="horaCitatorio">

        <input
          type="text"
          id="responsableCitatorio"
          placeholder="Responsable"
          readonly>

      </div>

      <textarea
        id="motivoCitatorio"
        placeholder="Motivo del citatorio"
        rows="4"></textarea>

      <textarea
        id="observacionesCitatorio"
        placeholder="Observaciones"
        rows="3"></textarea>

      <button onclick="registrarCitatorioAlumno()">
        Guardar citatorio
      </button>

      <hr style="margin:24px 0;">

      <h3>Seguimiento de citatorios</h3>

      <input
        type="text"
        id="busquedaCitatorios"
        placeholder="Buscar por alumno, UID o folio"
        onkeyup="buscarCitatoriosWeb()">

      <div id="resultadoBusquedaCitatorios"></div>

    </div>
  `;

const usuarioActivo =
  JSON.parse(
    localStorage.getItem('usuarioActivo')
  );

if(usuarioActivo){

  document.getElementById('responsableCitatorio').value =
    usuarioActivo.nombre || '';
}

  return;
}

  if(modulo === 'pases'){

  contenedor.innerHTML = `
    <div class="modulo-academico">

      <h3>Pase de salida</h3>

      <p>
        Registro institucional de salidas anticipadas.
      </p>

      <input
        type="text"
        id="buscadorAlumnoPase"
        placeholder="Buscar alumno: García, Guadalupe, López..."
        onkeyup="buscarAlumnoParaPase()">

      <div
        id="resultadosAlumnoPase"
        class="resultados-alumno-reporte">
      </div>

      <div class="form-grid">

        <input
          type="text"
          id="paseUID"
          placeholder="UID"
          readonly>

        <input
          type="text"
          id="paseAlumno"
          placeholder="Alumno"
          readonly>

        <input
          type="text"
          id="paseGrado"
          placeholder="Grado"
          readonly>

        <input
          type="text"
          id="paseGrupo"
          placeholder="Grupo"
          readonly>

        <input
          type="time"
          id="paseHoraSalida">

        <input
          type="text"
          id="pasePersonaRecoge"
          placeholder="Persona que recoge">

        <input
          type="text"
          id="paseParentesco"
          placeholder="Parentesco">

        <input
          type="text"
          id="paseAutoriza"
          placeholder="Autoriza">

      </div>

      <textarea
        id="paseMotivo"
        placeholder="Motivo de salida"
        rows="4"></textarea>

      <textarea
        id="paseObservaciones"
        placeholder="Observaciones"
        rows="3"></textarea>

      <button onclick="registrarPaseSalidaAlumno()">
        Guardar pase de salida
      </button>

    </div>
  `;

  return;
}

  if(modulo === 'justificantes'){

  contenedor.innerHTML = `
    <div class="modulo-academico">

      <h3>Justificantes escolares</h3>

      <p>
        Registro institucional de justificantes.
      </p>

      <input
        type="text"
        id="buscadorAlumnoJustificante"
        placeholder="Buscar alumno: García, Guadalupe, López..."
        onkeyup="buscarAlumnoParaJustificante()">

      <div
        id="resultadosAlumnoJustificante"
        class="resultados-alumno-reporte">
      </div>

      <div class="form-grid">

        <input
          type="text"
          id="justificanteUID"
          placeholder="UID"
          readonly>

        <input
          type="text"
          id="justificanteAlumno"
          placeholder="Alumno"
          readonly>

        <input
          type="text"
          id="justificanteGrado"
          placeholder="Grado"
          readonly>

        <input
          type="text"
          id="justificanteGrupo"
          placeholder="Grupo"
          readonly>

        <input
          type="text"
          id="justificanteFecha"
          readonly>

        <select
          id="tipoJustificante"
          onchange="mostrarTipoOtroJustificante()">

          <option value="">
            Tipo de justificante
          </option>

          <option>Médico</option>
          <option>Familiar</option>
          <option>Oficial</option>
          <option>Escolar</option>
          <option>Otro</option>

        </select>

      </div>

      <input
        type="text"
        id="tipoOtroJustificante"
        placeholder="Especifica el tipo de justificante"
        style="display:none; margin-top:10px;">

      <textarea
        id="motivoJustificante"
        placeholder="Motivo del justificante"
        rows="4">
      </textarea>

      <select
        id="solicitaJustificante"
        onchange="mostrarSolicitaOtro()">

        <option value="">
          Quién solicita
        </option>

        <option>Padre</option>
        <option>Madre</option>
        <option>Tutor</option>
        <option>Otro</option>

      </select>

      <input
        type="text"
        id="solicitaOtro"
        placeholder="Especifica quién solicita"
        style="display:none; margin-top:10px;">

      <div
        id="bloqueINE"
        style="display:none; margin-top:10px;">

        <label>
          Adjuntar identificación (INE)
        </label>

        <input
          type="file"
          id="archivoINE"
          accept="image/*">

      </div>

      <button onclick="registrarJustificanteAlumno()">
        Guardar justificante
      </button>

    </div>
  `;

  document.getElementById(
    'justificanteFecha'
  ).value =
    new Date().toLocaleDateString('es-MX');

  return;
}

  if(modulo === 'calificaciones'){

    mostrarModuloCalificaciones();

    return;
}
}

let alumnosReporteEncontrados = [];



function seleccionarAlumnoReporte(index){

  const alumno =
    alumnosReporteEncontrados[index];

  if(!alumno){
    return;
  }

  document.getElementById('reporteUID').value =
    alumno.uid || '';

  document.getElementById('reporteAlumno').value =
    alumno.nombre || '';

  document.getElementById('reporteGrado').value =
    alumno.grado || '';

  document.getElementById('reporteGrupo').value =
    alumno.grupoLetra || '';

  document.getElementById('buscadorAlumnoReporte').value =
    alumno.nombre || '';

  document.getElementById('resultadosAlumnoReporte').innerHTML =
    '';
}



async function buscarAlumnoParaReporte(){

  const input = document.getElementById('buscadorAlumnoReporte');
  const contenedor = document.getElementById('resultadosAlumnoReporte');

  if(!input || !contenedor) return;

  const busqueda = input.value.trim();

  contenedor.innerHTML = '';

  if(busqueda.length < 2) return;

  try{

    const respuesta = await fetch(
      API +
      '?accion=buscarReporteIndividual' +
      '&busqueda=' +
      encodeURIComponent(busqueda)
    );

    const alumnos = await respuesta.json();

    alumnosReporteEncontrados = Array.isArray(alumnos) ? alumnos : [];

    if(alumnosReporteEncontrados.length === 0){
      contenedor.innerHTML = `
        <p class="mensaje-vacio">
          No se encontraron alumnos.
        </p>
      `;
      return;
    }

    let html = '';

    alumnosReporteEncontrados.forEach((alumno,index) => {
      html += `
        <div
          class="item-alumno-reporte"
          onclick="seleccionarAlumnoReporte(${index})">

          <strong>${alumno.nombre}</strong>

          <small>
            UID: ${alumno.uid} · Grupo: ${alumno.grupo}
          </small>

        </div>
      `;
    });

    contenedor.innerHTML = html;

  }catch(error){

    console.error(error);

    contenedor.innerHTML = `
      <p class="mensaje-vacio">
        Error buscando alumno.
      </p>
    `;
  }
}

async function cargarReportesAlumnoIndividual(uid, alumno){

  const contenedor =
    document.getElementById('resultadoReporteIndividual');

  if(!contenedor){
    return;
  }

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=reportesPorAlumno' +
        '&uid=' +
        encodeURIComponent(uid) +
        '&alumno=' +
        encodeURIComponent(alumno || '')
      );

    const datos =
      await respuesta.json();

    const reportes =
      datos.reportes || [];

    let html = `
      <h3>Reportes escolares</h3>
    `;

    if(reportes.length === 0){

      html += `
        <p class="mensaje-vacio">
          Este alumno no tiene reportes registrados.
        </p>
      `;

    }else{

      html += `
        <table id="tablaReportesIndividual" class="tabla-individual">
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Docente</th>
            <th>Descripción</th>
            <th>Acción tomada</th>
          </tr>
      `;

      reportes.forEach(reporte => {

        html += `
          <tr>
            <td>${formatearFechaReporte(reporte.fecha)}</td>
            <td>${reporte.tipoReporte || ''}</td>
            <td>${reporte.docente || ''}</td>
            <td>${reporte.descripcion || ''}</td>
            <td>${reporte.accionTomada || ''}</td>
          </tr>
        `;
      });

      html += `</table>`;
    }

    contenedor.innerHTML += html;

  }catch(error){

    console.error(error);
  }
}

function formatearFechaReporte(fecha){

  if(!fecha){
    return 'Sin fecha';
  }

  const fechaObj =
    new Date(fecha);

  if(isNaN(fechaObj.getTime())){
    return fecha;
  }

  return fechaObj.toLocaleDateString(
    'es-MX',
    {
      day:'2-digit',
      month:'2-digit',
      year:'numeric'
    }
  );
}

let alumnosJustificanteEncontrados = [];

async function buscarAlumnoParaJustificante(){

  const input =
    document.getElementById(
      'buscadorAlumnoJustificante'
    );

  const contenedor =
    document.getElementById(
      'resultadosAlumnoJustificante'
    );

  if(!input || !contenedor){
    return;
  }

  const busqueda =
    input.value.trim();

  contenedor.innerHTML = '';

  if(busqueda.length < 2){
    return;
  }

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=buscarReporteIndividual' +
        '&busqueda=' +
        encodeURIComponent(busqueda)
      );

    const alumnos =
      await respuesta.json();

    alumnosJustificanteEncontrados =
      Array.isArray(alumnos)
      ? alumnos
      : [];

    if(alumnosJustificanteEncontrados.length === 0){

      contenedor.innerHTML = `
        <p class="mensaje-vacio">
          No se encontraron alumnos.
        </p>
      `;

      return;
    }

    let html = '';

    alumnosJustificanteEncontrados.forEach((alumno,index) => {

      html += `
        <div
          class="item-alumno-reporte"
          onclick="seleccionarAlumnoJustificante(${index})">

          <strong>${alumno.nombre}</strong>

          <small>
            UID: ${alumno.uid}
            · Grupo: ${alumno.grupo}
          </small>

        </div>
      `;
    });

    contenedor.innerHTML = html;

  }catch(error){

    console.error(error);
  }
}


function seleccionarAlumnoJustificante(index){

  const alumno =
    alumnosJustificanteEncontrados[index];

  if(!alumno){
    return;
  }

  document.getElementById(
    'justificanteUID'
  ).value =
    alumno.uid || '';

  document.getElementById(
    'justificanteAlumno'
  ).value =
    alumno.nombre || '';

  document.getElementById(
    'justificanteGrado'
  ).value =
    alumno.grado || '';

  document.getElementById(
    'justificanteGrupo'
  ).value =
    alumno.grupoLetra || '';

  document.getElementById(
    'buscadorAlumnoJustificante'
  ).value =
    alumno.nombre || '';

  document.getElementById(
    'resultadosAlumnoJustificante'
  ).innerHTML =
    '';
}


function mostrarTipoOtroJustificante(){

  const tipo =
    document.getElementById(
      'tipoJustificante'
    ).value;

  document.getElementById(
    'tipoOtroJustificante'
  ).style.display =
    tipo === 'Otro'
    ? 'block'
    : 'none';
}


function mostrarSolicitaOtro(){

  const solicita =
    document.getElementById(
      'solicitaJustificante'
    ).value;

  const mostrar =
    solicita === 'Otro';

  document.getElementById(
    'solicitaOtro'
  ).style.display =
    mostrar
    ? 'block'
    : 'none';

  document.getElementById(
    'bloqueINE'
  ).style.display =
    mostrar
    ? 'block'
    : 'none';
}


async function registrarJustificanteAlumno(){

  try{

    const usuarioActivo =
      JSON.parse(
        localStorage.getItem(
          'usuarioActivo'
        )
      );

    const params =
      new URLSearchParams({

        accion:'registrarJustificante',

        uid:
          document.getElementById(
            'justificanteUID'
          ).value,

        alumno:
          document.getElementById(
            'justificanteAlumno'
          ).value,

        grado:
          document.getElementById(
            'justificanteGrado'
          ).value,

        grupo:
          document.getElementById(
            'justificanteGrupo'
          ).value,

        tipoJustificante:
          document.getElementById(
            'tipoJustificante'
          ).value,

        tipoOtro:
          document.getElementById(
            'tipoOtroJustificante'
          ).value,

        motivo:
          document.getElementById(
            'motivoJustificante'
          ).value,

        solicita:
          document.getElementById(
            'solicitaJustificante'
          ).value,

        solicitaOtro:
          document.getElementById(
            'solicitaOtro'
          ).value,

        registradoPor:
          usuarioActivo.nombre

      });

    const respuesta =
      await fetch(
        API + '?' + params.toString()
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Justificante registrado correctamente.',
        'exito'
      );

    }else{

      mostrarMensajeSistema(
        datos.mensaje ||
        'No se pudo registrar el justificante.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error registrando justificante.',
      'error'
    );
  }
}

async function cargarJustificantesAlumnoIndividual(uid, alumno){

  const contenedor =
    document.getElementById('resultadoReporteIndividual');

  if(!contenedor){
    return;
  }

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=justificantesPorAlumno' +
        '&uid=' +
        encodeURIComponent(uid) +
        '&alumno=' +
        encodeURIComponent(alumno || '')
      );

    const datos =
      await respuesta.json();

    const justificantes =
      datos.justificantes || [];

    let html = `
      <h3>Justificantes escolares</h3>
    `;

    if(justificantes.length === 0){

      html += `
        <p class="mensaje-vacio">
          Este alumno no tiene justificantes registrados.
        </p>
      `;

    }else{

      html += `
        <table id="tablaJustificantesIndividual" class="tabla-individual">
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Solicita</th>
            <th>Motivo</th>
            <th>Registró</th>
          </tr>
      `;

      justificantes.forEach(justificante => {

        const tipo =
          justificante.tipoJustificante === 'Otro'
          ? justificante.tipoOtro
          : justificante.tipoJustificante;

        const solicita =
          justificante.solicita === 'Otro'
          ? justificante.solicitaOtro
          : justificante.solicita;

        html += `
          <tr>
            <td>${formatearFechaReporte(justificante.fecha)}</td>
            <td>${tipo || ''}</td>
            <td>${solicita || ''}</td>
            <td>${justificante.motivo || ''}</td>
            <td>${justificante.registradoPor || ''}</td>
          </tr>
        `;
      });

      html += `</table>`;
    }

    contenedor.innerHTML += html;

  }catch(error){

    console.error(error);
  }
}

let alumnosPaseEncontrados = [];

async function buscarAlumnoParaPase(){

  const input =
    document.getElementById('buscadorAlumnoPase');

  const contenedor =
    document.getElementById('resultadosAlumnoPase');

  if(!input || !contenedor){
    return;
  }

  const busqueda =
    input.value.trim();

  contenedor.innerHTML = '';

  if(busqueda.length < 2){
    return;
  }

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=buscarReporteIndividual' +
        '&busqueda=' +
        encodeURIComponent(busqueda)
      );

    const alumnos =
      await respuesta.json();

    alumnosPaseEncontrados =
      Array.isArray(alumnos)
      ? alumnos
      : [];

    if(alumnosPaseEncontrados.length === 0){

      contenedor.innerHTML = `
        <p class="mensaje-vacio">
          No se encontraron alumnos.
        </p>
      `;

      return;
    }

    let html = '';

    alumnosPaseEncontrados.forEach((alumno,index) => {

      html += `
        <div
          class="item-alumno-reporte"
          onclick="seleccionarAlumnoPase(${index})">

          <strong>${alumno.nombre}</strong>

          <small>
            UID: ${alumno.uid}
            · Grupo: ${alumno.grupo}
          </small>

        </div>
      `;
    });

    contenedor.innerHTML = html;

  }catch(error){

    console.error(error);

    contenedor.innerHTML = `
      <p class="mensaje-vacio">
        Error buscando alumno.
      </p>
    `;
  }
}


function seleccionarAlumnoPase(index){

  const alumno =
    alumnosPaseEncontrados[index];

  if(!alumno){
    return;
  }

  document.getElementById('paseUID').value =
    alumno.uid || '';

  document.getElementById('paseAlumno').value =
    alumno.nombre || '';

  document.getElementById('paseGrado').value =
    alumno.grado || '';

  document.getElementById('paseGrupo').value =
    alumno.grupoLetra || '';

  document.getElementById('buscadorAlumnoPase').value =
    alumno.nombre || '';

  document.getElementById('resultadosAlumnoPase').innerHTML =
    '';
}


async function registrarPaseSalidaAlumno(){

  const usuarioActivo =
    JSON.parse(
      localStorage.getItem('usuarioActivo')
    );

  if(!usuarioActivo){

    mostrarMensajeSistema(
      'No hay sesión activa.',
      'error'
    );

    return;
  }

  const params =
    new URLSearchParams({

      accion:'registrarPaseSalida',

      uid:
        document.getElementById('paseUID').value,

      alumno:
        document.getElementById('paseAlumno').value,

      grado:
        document.getElementById('paseGrado').value,

      grupo:
        document.getElementById('paseGrupo').value,

      horaSalida:
        document.getElementById('paseHoraSalida').value,

      motivo:
        document.getElementById('paseMotivo').value,

      personaRecoge:
        document.getElementById('pasePersonaRecoge').value,

      parentesco:
        document.getElementById('paseParentesco').value,

      autoriza:
        document.getElementById('paseAutoriza').value,

      observaciones:
        document.getElementById('paseObservaciones').value,

      registradoPor:
        usuarioActivo.nombre

    });

  mostrarLoader('Guardando pase de salida...');

  try{

    const respuesta =
      await fetch(
        API + '?' + params.toString()
      );

    const datos =
      await respuesta.json();

    if(datos.success){

  mostrarMensajeSistema(
    'Pase registrado correctamente. Folio: ' + datos.folio,
    'exito'
  );

  mostrarPaseSalidaImprimible({
    folio: datos.folio,
    alumno: document.getElementById('paseAlumno').value,
    grado: document.getElementById('paseGrado').value,
    grupo: document.getElementById('paseGrupo').value,
    horaSalida: document.getElementById('paseHoraSalida').value,
    motivo: document.getElementById('paseMotivo').value,
    personaRecoge: document.getElementById('pasePersonaRecoge').value,
    parentesco: document.getElementById('paseParentesco').value,
    autoriza: document.getElementById('paseAutoriza').value,
    observaciones: document.getElementById('paseObservaciones').value,
    registradoPor: usuarioActivo.nombre
  });

}else{

      mostrarMensajeSistema(
        datos.mensaje ||
        'No se pudo registrar el pase.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error registrando pase de salida.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

async function cargarPasesSalidaAlumnoIndividual(uid, alumno){

  const contenedor =
    document.getElementById(
      'resultadoReporteIndividual'
    );

  if(!contenedor){
    return;
  }

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=pasesSalidaPorAlumno' +
        '&uid=' +
        encodeURIComponent(uid) +
        '&alumno=' +
        encodeURIComponent(alumno || '')
      );

    const datos =
      await respuesta.json();

    const pases =
      datos.pases || [];

    let html = `
      <h3>Pases de salida</h3>
    `;

    if(pases.length === 0){

      html += `
        <p class="mensaje-vacio">
          Este alumno no tiene pases registrados.
        </p>
      `;

    }else{

      html += `
        <table id="tablaPasesIndividual" class="tabla-individual">

          <tr>
            <th>Fecha</th>
            <th>Hora salida</th>
            <th>Motivo</th>
            <th>Recoge</th>
            <th>Autoriza</th>
            <th>Folio</th>
          </tr>
      `;

      pases.forEach(pase => {

        html += `
          <tr>

            <td>
              ${formatearFechaReporte(pase.fecha)}
            </td>

            <td>
              ${formatearHoraCorta(pase.horaSalida)}
            </td>

            <td>
              ${pase.motivo || ''}
            </td>

            <td>
              ${pase.personaRecoge || ''}
            </td>

            <td>
              ${pase.autoriza || ''}
            </td>

            <td>
              ${pase.folio || ''}
            </td>

          </tr>
        `;
      });

      html += `
        </table>
      `;
    }

    contenedor.innerHTML += html;

  }catch(error){

    console.error(error);
  }
}

function mostrarPaseSalidaImprimible(pase){

  const contenedor =
    document.getElementById('contenedorModuloAcademico');

  if(!contenedor){
    return;
  }

  contenedor.innerHTML += `
    <div id="paseSalidaImprimible" class="pase-salida-imprimible">

      <div class="pase-header">
        <img src="logo.png" class="pase-logo">

        <div>
          <h2>PASE DE SALIDA</h2>
          <p>Sistema de Asistencia Escolar</p>
          <p><strong>Folio:</strong> ${pase.folio}</p>
        </div>
      </div>

      <div class="pase-datos">

        <p><strong>Alumno:</strong> ${pase.alumno}</p>
        <p><strong>Grupo:</strong> ${pase.grado} ${pase.grupo}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}</p>
        <p><strong>Hora de salida:</strong> ${pase.horaSalida}</p>
        <p><strong>Motivo:</strong> ${pase.motivo}</p>
        <p><strong>Persona que recoge:</strong> ${pase.personaRecoge}</p>
        <p><strong>Parentesco:</strong> ${pase.parentesco}</p>
        <p><strong>Autoriza:</strong> ${pase.autoriza}</p>
        <p><strong>Registró:</strong> ${pase.registradoPor}</p>
        <p><strong>Observaciones:</strong> ${pase.observaciones || 'Sin observaciones'}</p>

      </div>

      <div class="pase-firmas">

        <div>
          <div class="linea-firma"></div>
          <p>Firma de autorización</p>
        </div>

        <div>
          <div class="linea-firma"></div>
          <p>Firma de quien recoge</p>
        </div>

        <div>
          <div class="linea-firma"></div>
          <p>Control de acceso</p>
        </div>

      </div>

      <div class="acciones-pase no-print">

  <button onclick="imprimirPaseSalida()">
    Imprimir pase
  </button>

  <button
    class="btn-cerrar-pase"
    onclick="cerrarPaseSalida()">

    Cerrar pase
  </button>

</div>

    </div>
  `;
}


function imprimirPaseSalida(){

  const pase =
    document.getElementById('paseSalidaImprimible');

  if(!pase){
    mostrarMensajeSistema(
      'No hay pase para imprimir.',
      'error'
    );
    return;
  }

  const ventana =
    window.open('', '_blank');

  ventana.document.write(`
    <html>
      <head>
        <title>Pase de salida</title>
        <link rel="stylesheet" href="styles.css">
      </head>

      <body>
        ${pase.outerHTML}

        <script>
          window.onload = function(){
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);

  ventana.document.close();
}

function cerrarPaseSalida(){

  const pase =
    document.getElementById(
      'paseSalidaImprimible'
    );

  if(pase){
    pase.remove();
  }
}

let alumnosCitatorioEncontrados = [];

async function buscarAlumnoParaCitatorio(){

  const input =
    document.getElementById(
      'buscadorAlumnoCitatorio'
    );

  const contenedor =
    document.getElementById(
      'resultadosAlumnoCitatorio'
    );

  if(!input || !contenedor){
    return;
  }

  const busqueda =
    input.value.trim();

  contenedor.innerHTML = '';

  if(busqueda.length < 2){
    return;
  }

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=buscarReporteIndividual' +
        '&busqueda=' +
        encodeURIComponent(busqueda)
      );

    const alumnos =
      await respuesta.json();

    alumnosCitatorioEncontrados =
      Array.isArray(alumnos)
      ? alumnos
      : [];

    if(alumnosCitatorioEncontrados.length === 0){

      contenedor.innerHTML = `
        <p class="mensaje-vacio">
          No se encontraron alumnos.
        </p>
      `;

      return;
    }

    let html = '';

    alumnosCitatorioEncontrados.forEach((alumno,index) => {

      html += `
        <div
          class="item-alumno-reporte"
          onclick="seleccionarAlumnoCitatorio(${index})">

          <strong>${alumno.nombre}</strong>

          <small>
            UID: ${alumno.uid}
            · Grupo: ${alumno.grupo}
          </small>

        </div>
      `;
    });

    contenedor.innerHTML = html;

  }catch(error){

    console.error(error);
  }
}


function seleccionarAlumnoCitatorio(index){

  const alumno =
    alumnosCitatorioEncontrados[index];

  if(!alumno){
    return;
  }

  document.getElementById(
    'citatorioUID'
  ).value =
    alumno.uid || '';

  document.getElementById(
    'citatorioAlumno'
  ).value =
    alumno.nombre || '';

  document.getElementById(
    'citatorioGrado'
  ).value =
    alumno.grado || '';

  document.getElementById(
    'citatorioGrupo'
  ).value =
    alumno.grupoLetra || '';

  document.getElementById(
    'buscadorAlumnoCitatorio'
  ).value =
    alumno.nombre || '';

  document.getElementById(
    'resultadosAlumnoCitatorio'
  ).innerHTML =
    '';
}


async function registrarCitatorioAlumno(){

  const usuarioActivo =
    JSON.parse(
      localStorage.getItem('usuarioActivo')
    );

  if(!usuarioActivo){

    mostrarMensajeSistema(
      'No hay sesión activa.',
      'error'
    );

    return;
  }

  const params =
    new URLSearchParams({

      accion:'registrarCitatorio',

      uid:
        document.getElementById('citatorioUID').value,

      alumno:
        document.getElementById('citatorioAlumno').value,

      grado:
        document.getElementById('citatorioGrado').value,

      grupo:
        document.getElementById('citatorioGrupo').value,

      fechaCitatorio:
        document.getElementById('fechaCitatorio').value,

      horaCitatorio:
        document.getElementById('horaCitatorio').value,

      motivo:
        document.getElementById('motivoCitatorio').value,

      responsable:
        document.getElementById('responsableCitatorio').value,

      observaciones:
        document.getElementById('observacionesCitatorio').value,

      areaCita:
        usuarioActivo.rol || usuarioActivo.nombre,

      registradoPor:
        usuarioActivo.nombre

    });

  mostrarLoader('Guardando citatorio...');

  try{

    const respuesta =
      await fetch(
        API + '?' + params.toString()
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      let mensajeFinal =
        'Citatorio registrado correctamente. Folio: ' +
        datos.folio +
        '. ';

      if(datos.correoEnviado){
        mensajeFinal +=
          'Correo de citatorio enviado al tutor. ';
      }else{
        mensajeFinal +=
          'No se pudo enviar el correo al tutor. ';
      }

      if(datos.pushEnviado){
        mensajeFinal +=
          'Notificación push enviada al tutor.';
      }else{
        mensajeFinal +=
          'No se pudo enviar la notificación push.';
      }

      mostrarMensajeSistema(
        mensajeFinal,
        datos.correoEnviado || datos.pushEnviado
          ? 'exito'
          : 'info'
      );

      buscarCitatoriosWeb();

    }else{

      mostrarMensajeSistema(
        datos.mensaje ||
        'No se pudo registrar el citatorio.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error registrando citatorio.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}


async function buscarCitatoriosWeb(){

  const busqueda =
    document.getElementById(
      'busquedaCitatorios'
    )?.value || '';

  const contenedor =
    document.getElementById(
      'resultadoBusquedaCitatorios'
    );

  if(!contenedor){
    return;
  }

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=buscarCitatorios' +
        '&busqueda=' +
        encodeURIComponent(busqueda)
      );

    const datos =
      await respuesta.json();

    const citatorios =
      datos.citatorios || [];

    if(citatorios.length === 0){

      contenedor.innerHTML = `
        <p class="mensaje-vacio">
          No se encontraron citatorios.
        </p>
      `;

      return;
    }

    let html = `
      <table class="tabla-individual">

        <tr>
          <th>Alumno</th>
          <th>Fecha</th>
          <th>Responsable</th>
          <th>Folio</th>
          <th>Seguimiento</th>
        </tr>
    `;

    citatorios.forEach(citatorio => {

      html += `
        <tr>

          <td>
            ${citatorio.alumno}
          </td>

          <td>
            ${citatorio.fechaCitatorio}
          </td>

          <td>
            ${citatorio.responsable || ''}
          </td>

          <td>
            ${citatorio.folio}
          </td>

          <td>

            <select
              onchange="
                actualizarSeguimientoCitatorioWeb(
                  '${citatorio.folio}',
                  this.value
                )
              ">

              <option
                value="No atendido"
                ${
                  citatorio.seguimiento ===
                  'No atendido'
                  ? 'selected'
                  : ''
                }>

                No atendido

              </option>

              <option
                value="Atendido"
                ${
                  citatorio.seguimiento ===
                  'Atendido'
                  ? 'selected'
                  : ''
                }>

                Atendido

              </option>

            </select>

          </td>

        </tr>
      `;
    });

    html += `
      </table>
    `;

    contenedor.innerHTML = html;

  }catch(error){

    console.error(error);
  }
}


async function actualizarSeguimientoCitatorioWeb(
  folio,
  seguimiento
){

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=actualizarSeguimientoCitatorio' +
        '&folio=' +
        encodeURIComponent(folio) +
        '&seguimiento=' +
        encodeURIComponent(seguimiento)
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Seguimiento actualizado.',
        'exito'
      );

    }else{

      mostrarMensajeSistema(
        datos.mensaje,
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error actualizando seguimiento.',
      'error'
    );
  }
}

async function cargarCitatoriosAlumnoIndividual(uid, alumno){

  const contenedor =
    document.getElementById(
      'resultadoReporteIndividual'
    );

  if(!contenedor){
    return;
  }

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=citatoriosPorAlumno' +
        '&uid=' +
        encodeURIComponent(uid) +
        '&alumno=' +
        encodeURIComponent(alumno || '')
      );

    const datos =
      await respuesta.json();

    const citatorios =
      datos.citatorios || [];

    let html = `
      <h3>Citatorios escolares</h3>
    `;

    if(citatorios.length === 0){

      html += `
        <p class="mensaje-vacio">
          Este alumno no tiene citatorios registrados.
        </p>
      `;

    }else{

      html += `
        <table id="tablaCitatoriosIndividual" class="tabla-individual">

          <tr>
            <th>Fecha registro</th>
            <th>Alumno</th>
            <th>Grado</th>
            <th>Grupo</th>
            <th>Fecha citatorio</th>
            <th>Hora</th>
            <th>Motivo</th>
            <th>Observaciones</th>
            <th>Registrado por</th>
            <th>Seguimiento</th>
          </tr>
      `;

      citatorios.forEach(citatorio => {

        html += `
          <tr>

            <td>${formatearFechaReporte(citatorio.fechaRegistro)}</td>
            <td>${citatorio.alumno || ''}</td>
            <td>${citatorio.grado || ''}</td>
            <td>${citatorio.grupo || ''}</td>
            <td>${formatearFechaCorta(citatorio.fechaCitatorio)}</td>
            <td>${formatearHoraCorta(citatorio.horaCitatorio)}</td>
            <td>${citatorio.motivo || ''}</td>
            <td>${citatorio.observaciones || ''}</td>
            <td>${citatorio.registradoPor || ''}</td>
            <td>${citatorio.seguimiento || ''}</td>

          </tr>
        `;
      });

      html += `
        </table>
      `;
    }

    contenedor.innerHTML += html;

  contenedor.innerHTML += `
  <div class="acciones-reporte-individual">
    <button
      onclick="generarPDFIndividual()"
      class="btn-pdf-individual">

      Generar PDF individual

    </button>
  </div>
`;

  }catch(error){

    console.error(error);
  }
}

function formatearFechaCorta(valor){

  if(!valor){
    return '';
  }

  const fecha =
    new Date(valor);

  if(isNaN(fecha.getTime())){
    return valor;
  }

  return fecha.toLocaleDateString(
    'es-MX',
    {
      day:'2-digit',
      month:'2-digit',
      year:'numeric'
    }
  );
}


function formatearHoraCorta(valor){

  if(!valor){
    return '';
  }

  const fecha =
    new Date(valor);

  if(isNaN(fecha.getTime())){
    return valor;
  }

  return fecha.toLocaleTimeString(
    'es-MX',
    {
      hour:'2-digit',
      minute:'2-digit'
    }
  );
}

// =====================================
// MOSTRAR MÓDULO CALIFICACIONES
// =====================================

function mostrarModuloCalificaciones(){

  const contenedor =
    document.getElementById('contenedorModuloAcademico');

  let opciones = '';

  materiasDocente.forEach(function(item, index){

    opciones += `
      <option value="${index}">
        ${item.materia} - ${item.grado} ${item.grupo}
      </option>
    `;

  });

  contenedor.innerHTML = `
    <div class="form-admin">

      <h3>Captura masiva de calificaciones</h3>

      <div class="grid-admin">

        <select id="selectorMateriaDocente">
          <option value="">Selecciona materia y grupo</option>
          ${opciones}
        </select>

        <select id="calificacionPeriodo">
          <option value="">Selecciona periodo</option>
          <option value="1er Periodo">1er Periodo</option>
          <option value="2do Periodo">2do Periodo</option>
          <option value="3er Periodo">3er Periodo</option>
        </select>

        <input
          type="text"
          id="calificacionCiclo"
          placeholder="Ciclo escolar: 2025-2026">

      </div>

      <br>

      <button onclick="generarTablaCalificaciones()">
        Generar lista de alumnos
      </button>

      <button onclick="consultarListaCalificaciones()">
        Consultar lista guardada
      </button>

      <button onclick="descargarPlantillaCalificaciones()">
        Descargar plantilla XLSX
      </button>

      <button onclick="prepararImportacionXLSX()">
        Importar XLSX
      </button>

      <button onclick="consultarResumenAcademico()">
        Ver resumen académico
      </button>

      <button onclick="verTopAlumnosAcademico()">
        Top alumnos
      </button>

      <button onclick="compararGruposAcademicosFrontend()">
        Comparar grupos
      </button>

      <button onclick="verRankingGruposAcademico()">
        Ranking de grupos
      </button>

      <input
        type="file"
        id="archivoXLSXCalificaciones"
        accept=".xlsx,.xls"
        style="display:none"
        onchange="procesarArchivoXLSXCalificaciones(event)">

      <p id="mensajeCalificaciones"></p>

      <div id="tablaCapturaCalificaciones"></div>

    </div>
  `;
}

// =====================================
// CARGAR MATERIAS SEGÚN GRADO
// =====================================

function cargarMateriasCalificacion(){

  const grado =
    document.getElementById(
      'calificacionGrado'
    ).value;

  const selectMateria =
    document.getElementById(
      'calificacionMateria'
    );

  selectMateria.innerHTML =
    '<option value="">Selecciona materia</option>';

  let materias = [];

  if(grado === 'Primero'){

    materias = [
      'Español',
      'Inglés',
      'Artes',
      'Matemáticas',
      'Biología',
      'Tecnología',
      'Geografía',
      'Formación Cívica y Ética',
      'Educación Física',
      'Tutoría'
    ];

  }

  if(grado === 'Segundo'){

    materias = [
      'Español',
      'Inglés',
      'Artes',
      'Matemáticas',
      'Física',
      'Tecnología',
      'Historia',
      'Formación Cívica y Ética',
      'Educación Física',
      'Tutoría'
    ];

  }

  if(grado === 'Tercero'){

    materias = [
      'Español',
      'Inglés',
      'Artes',
      'Matemáticas',
      'Química',
      'Tecnología',
      'Historia',
      'Formación Cívica y Ética',
      'Educación Física',
      'Tutoría'
    ];

  }

  materias.forEach(function(materia){

    const option =
      document.createElement('option');

    option.value = materia;
    option.textContent = materia;

    selectMateria.appendChild(option);

  });

}

// =====================================
// CARGAR MATERIAS DEL DOCENTE
// =====================================

async function cargarMateriasDocente(){

  try{

    const respuesta = await fetch(
      API +
      '?accion=obtenerMateriasDocente' +
      '&usuario=' + encodeURIComponent(usuarioActual)
    );

    const data = await respuesta.json();

    if(data.ok){

      materiasDocente = data.datos;

      console.log(
        'Materias del docente:',
        materiasDocente
      );

    }

  }catch(error){

    console.error(
      'Error cargando materias:',
      error
    );

  }

}

// =====================================
// GENERAR TABLA DE CALIFICACIONES
// =====================================

async function generarTablaCalificaciones(){

  const selector =
    document.getElementById('selectorMateriaDocente');

  const periodo =
    document.getElementById('calificacionPeriodo').value;

  const tabla =
    document.getElementById('tablaCapturaCalificaciones');

  const mensaje =
    document.getElementById('mensajeCalificaciones');

  const indice =
    selector.value;

  if(indice === ''){

    mensaje.textContent =
      'Selecciona una materia y grupo.';

    return;
  }

  if(periodo === ''){

    mensaje.textContent =
      'Selecciona un periodo.';

    return;
  }

  const asignacion =
    materiasDocente[indice];

  mostrarLoader(
    'Cargando alumnos...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerAlumnosGrupoCalificaciones' +
        '&grado=' + encodeURIComponent(asignacion.grado) +
        '&grupo=' + encodeURIComponent(asignacion.grupo)
      );

    const data =
      await respuesta.json();

    if(!data.ok){

      mensaje.textContent =
        data.mensaje || 'No se pudieron cargar alumnos.';

      return;
    }

    if(data.datos.length === 0){

      tabla.innerHTML =
        '<p>No hay alumnos en este grupo.</p>';

      return;
    }

    let html = `
      <br>
      <h4>
        ${asignacion.materia} - ${asignacion.grado} ${asignacion.grupo}
      </h4>

      <table>
        <thead>
          <tr>
            <th>Alumno</th>
            <th>Calificación</th>
          </tr>
        </thead>
        <tbody>
    `;

  data.datos.forEach(function(alumno){

  const esBaja =
    alumno.estatus === 'BAJA' ||
    alumno.estatus === 'BAJA_ACADEMICA' ||
    alumno.estatus === 'BAJA_DEFINITIVA';

  const esAlta =
    alumno.estatus === 'ALTA';

  html += `
    <tr class="${esBaja ? 'fila-baja' : ''}">
      <td>
        ${alumno.alumno}
        ${esBaja ? ' (BAJA)' : ''}
        ${esAlta ? ' (ALTA)' : ''}
      </td>

      <td>
        ${
          esBaja
          ? '<strong>BAJA</strong>'
          : `
            <input
              type="text"
              inputmode="decimal"
              class="input-calificacion"
              data-uid="${alumno.uid}"
              data-alumno="${alumno.alumno}"
              data-grado="${alumno.grado}"
              data-grupo="${alumno.grupo}"
              placeholder="Ej. 8.5">
          `
        }
      </td>
    </tr>
  `;

});

    html += `
        </tbody>
      </table>

      <br>

      <button onclick="guardarCalificacionesGrupo()">
        Guardar calificaciones del grupo
      </button>
    `;

    tabla.innerHTML = html;

    mensaje.textContent =
      'Lista generada correctamente.';

  }catch(error){

    console.error(error);

    mensaje.textContent =
      'Error al cargar alumnos.';

  }finally{

    ocultarLoader();
  }

}

// =====================================
// GUARDAR CALIFICACIONES DEL GRUPO
// =====================================

async function guardarCalificacionesGrupo(){

  const selector =
    document.getElementById('selectorMateriaDocente');

  const periodo =
    document.getElementById('calificacionPeriodo').value;

  const mensaje =
    document.getElementById('mensajeCalificaciones');

  const indice =
    selector.value;

  if(indice === ''){

    mensaje.textContent =
      'Selecciona una materia y grupo.';

    return;
  }

  if(periodo === ''){

    mensaje.textContent =
      'Selecciona un periodo.';

    return;
  }

  const asignacion =
    materiasDocente[indice];

  const inputs =
    document.querySelectorAll('.input-calificacion');

  let guardadas = 0;

  mostrarLoader(
    'Guardando calificaciones...'
  );

  try{

    for(const input of inputs){

      const calificacion =
        input.value.trim();

      if(calificacion === ''){
        continue;
      }

      const numero =
        Number(calificacion);

      if(isNaN(numero) || numero < 0 || numero > 10){

        mensaje.textContent =
          'Hay una calificación inválida. Usa valores de 0 a 10.';

        ocultarLoader();
        return;
      }

      const respuesta =
        await fetch(
          API +
          '?accion=guardarCalificacion' +
          '&uid=' + encodeURIComponent(input.dataset.uid) +
          '&alumno=' + encodeURIComponent(input.dataset.alumno) +
          '&grado=' + encodeURIComponent(input.dataset.grado) +
          '&grupo=' + encodeURIComponent(input.dataset.grupo) +
          '&materia=' + encodeURIComponent(asignacion.materia) +
          '&periodo=' + encodeURIComponent(periodo) +
          '&calificacion=' + encodeURIComponent(calificacion) +
          '&cicloEscolar=' + encodeURIComponent('ACTUAL') +
          '&usuario=' + encodeURIComponent(usuarioActual)
        );

      const data =
        await respuesta.json();

      if(data.ok){
        guardadas++;
      }

    }

    mensaje.textContent =
      'Calificaciones guardadas: ' + guardadas;

  }catch(error){

    console.error(error);

    mensaje.textContent =
      'Error al guardar calificaciones.';

  }finally{

    ocultarLoader();
  }

}

// =====================================
// GUARDAR / ACTUALIZAR CALIFICACIÓN
// =====================================

function guardarCalificacion(e){

  asegurarEncabezadosCalificaciones();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('CALIFICACIONES');

  var uid = String(e.parameter.uid || '').trim();
  var alumno = String(e.parameter.alumno || '').trim();
  var grado = String(e.parameter.grado || '').trim();
  var grupo = String(e.parameter.grupo || '').trim();
  var materia = String(e.parameter.materia || '').trim();
  var periodo = String(e.parameter.periodo || '').trim();
  var calificacion = String(e.parameter.calificacion || '').trim();
  var cicloEscolar = String(e.parameter.cicloEscolar || 'ACTUAL').trim();

  if (
    uid === '' ||
    alumno === '' ||
    grado === '' ||
    grupo === '' ||
    materia === '' ||
    periodo === '' ||
    calificacion === ''
  ) {
    return responderJSON({
      ok: false,
      mensaje: 'Faltan datos para guardar la calificación.'
    });
  }

  var datos = hoja.getDataRange().getValues();

  for (var i = 1; i < datos.length; i++) {

    var uidFila = String(datos[i][0]).trim();
    var materiaFila = String(datos[i][4]).trim();
    var periodoFila = String(datos[i][5]).trim();

    if (
      uidFila === uid &&
      materiaFila === materia &&
      periodoFila === periodo
    ) {

      hoja.getRange(i + 1, 2).setValue(alumno);
      hoja.getRange(i + 1, 3).setValue(grado);
      hoja.getRange(i + 1, 4).setValue(grupo);
      hoja.getRange(i + 1, 7).setValue(calificacion);
      hoja.getRange(i + 1, 8).setValue(cicloEscolar);
      hoja.getRange(i + 1, 9).setValue(new Date());

      return responderJSON({
        ok: true,
        actualizado: true,
        mensaje: 'Calificación actualizada correctamente.'
      });

    }

  }

  hoja.appendRow([
    uid,
    alumno,
    grado,
    grupo,
    materia,
    periodo,
    calificacion,
    cicloEscolar,
    new Date()
  ]);

  return responderJSON({
    ok: true,
    actualizado: false,
    mensaje: 'Calificación guardada correctamente.'
  });
}

// =====================================
// CONSULTAR LISTA DE CALIFICACIONES
// =====================================

async function consultarListaCalificaciones(){

  const selector =
    document.getElementById('selectorMateriaDocente');

  const periodo =
    document.getElementById('calificacionPeriodo').value;

  const tabla =
    document.getElementById('tablaCapturaCalificaciones');

  const mensaje =
    document.getElementById('mensajeCalificaciones');

  const indice =
    selector.value;

  if(indice === ''){

    mensaje.textContent =
      'Selecciona una materia y grupo.';

    return;
  }

  if(periodo === ''){

    mensaje.textContent =
      'Selecciona un periodo.';

    return;
  }

  const asignacion =
    materiasDocente[indice];

  mostrarLoader(
    'Consultando lista guardada...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerListaCalificaciones' +
        '&materia=' + encodeURIComponent(asignacion.materia) +
        '&grado=' + encodeURIComponent(asignacion.grado) +
        '&grupo=' + encodeURIComponent(asignacion.grupo) +
        '&periodo=' + encodeURIComponent(periodo)
      );

    const data =
      await respuesta.json();

    if(!data.ok){

      mensaje.textContent =
        data.mensaje || 'No se pudo consultar la lista.';

      return;
    }

    if(data.datos.length === 0){

      tabla.innerHTML =
        '<p>No hay calificaciones guardadas para esta selección.</p>';

      return;
    }

    let html = `
      <div id="listaCalificacionesImprimir">

  <div class="info-lista-calificaciones">
    <p>
      <strong>Materia:</strong> ${asignacion.materia}<br>
      <strong>Grado y grupo:</strong> ${asignacion.grado} ${asignacion.grupo}<br>
      <strong>Periodo:</strong> ${periodo}<br>
      <strong>Docente:</strong> ${asignacion.docente || usuarioActual}<br>
      <strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-MX')}
    </p>
  </div>

        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Alumno</th>
              <th>Calificación</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.datos.forEach(function(item, index){

      html += `
        <tr>
          <td>${index + 1}</td>
          <td>
  ${
    item.estatus === 'BAJA' ||
    item.estatus === 'BAJA_ACADEMICA' ||
    item.estatus === 'BAJA_DEFINITIVA'
    ? item.alumno + ' (BAJA)'
    : item.alumno
  }
</td>

<td>
  ${item.calificacion || 'S/C'}
</td>
        </tr>
      `;

    });

    html += `
          </tbody>
        </table>

      </div>

      <br>

      <button onclick="generarPDFListaCalificaciones()">
        Imprimir / Generar PDF
      </button>
    `;

    tabla.innerHTML = html;

    mensaje.textContent =
      'Lista consultada correctamente.';

  }catch(error){

    console.error(error);

    mensaje.textContent =
      'Error al consultar la lista.';

  }finally{

    ocultarLoader();
  }

}

function prepararImportacionXLSX(){
  document.getElementById('archivoXLSXCalificaciones').click();
}

// =====================================
// PROCESAR XLSX CALIFICACIONES
// =====================================

async function procesarArchivoXLSXCalificaciones(event){

  const archivo =
    event.target.files[0];

  if(!archivo){
    return;
  }

  const selector =
    document.getElementById('selectorMateriaDocente');

  const periodo =
    document.getElementById('calificacionPeriodo').value;

  const mensaje =
    document.getElementById('mensajeCalificaciones');

  const indice =
    selector.value;

  if(indice === ''){

    mensaje.textContent =
      'Selecciona materia y grupo antes de importar.';

    return;
  }

  if(periodo === ''){

    mensaje.textContent =
      'Selecciona periodo antes de importar.';

    return;
  }

  const asignacion =
    materiasDocente[indice];

  mostrarLoader(
    'Procesando archivo Excel...'
  );

  try{

    const reader =
      new FileReader();

    reader.onload = async function(e){

      const data =
        new Uint8Array(e.target.result);

      const workbook =
        XLSX.read(data, { type:'array' });

      const hoja =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const filas =
        XLSX.utils.sheet_to_json(hoja);

      let procesadas = 0;
      let errores = 0;

      for(const fila of filas){

        const uid =
          String(fila.UID || '').trim();

        const alumno =
          String(fila.Alumno || '').trim();

        const calificacion =
          String(fila.Calificación || '').trim();

        if(
          uid === '' ||
          alumno === '' ||
          calificacion === ''
        ){
          errores++;
          continue;
        }

        try{

          const respuesta =
            await fetch(
              API +
              '?accion=guardarCalificacion' +
              '&uid=' + encodeURIComponent(uid) +
              '&alumno=' + encodeURIComponent(alumno) +
              '&grado=' + encodeURIComponent(asignacion.grado) +
              '&grupo=' + encodeURIComponent(asignacion.grupo) +
              '&materia=' + encodeURIComponent(asignacion.materia) +
              '&periodo=' + encodeURIComponent(periodo) +
              '&calificacion=' + encodeURIComponent(calificacion) +
              '&cicloEscolar=' + encodeURIComponent('ACTUAL') +
              '&usuario=' + encodeURIComponent(usuarioActual)
            );

          const resultado =
            await respuesta.json();

          if(resultado.ok){
            procesadas++;
          }else{
            errores++;
          }

        }catch(error){

          console.error(error);
          errores++;

        }

      }

      mensaje.textContent =
        'Importación completada. ' +
        'Procesadas: ' + procesadas +
        ' | Errores: ' + errores;

      ocultarLoader();

    };

    reader.readAsArrayBuffer(archivo);

  }catch(error){

    console.error(error);

    mensaje.textContent =
      'Error al procesar Excel.';

    ocultarLoader();

  }

}

// =====================================
// DESCARGAR PLANTILLA XLSX CALIFICACIONES
// =====================================

async function descargarPlantillaCalificaciones(){

  const selector =
    document.getElementById('selectorMateriaDocente');

  const mensaje =
    document.getElementById('mensajeCalificaciones');

  const indice =
    selector.value;

  if(indice === ''){

    mensaje.textContent =
      'Selecciona una materia y grupo.';

    return;
  }

  const asignacion =
    materiasDocente[indice];

  mostrarLoader(
    'Generando plantilla Excel...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerAlumnosGrupoCalificaciones' +
        '&grado=' + encodeURIComponent(asignacion.grado) +
        '&grupo=' + encodeURIComponent(asignacion.grupo)
      );

    const data =
      await respuesta.json();

    if(!data.ok || data.datos.length === 0){

      mensaje.textContent =
        'No hay alumnos para generar plantilla.';

      return;
    }

    const filas =
      data.datos.map(function(alumno){

        return {
          UID: alumno.uid,
          Alumno: alumno.alumno,
          Calificación: ''
        };

      });

    const hoja =
      XLSX.utils.json_to_sheet(filas);

    const libro =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      libro,
      hoja,
      'Calificaciones'
    );

    const nombreArchivo =
      'Plantilla_' +
      asignacion.materia.replaceAll(' ', '_') +
      '_' +
      asignacion.grado.replaceAll(' ', '_') +
      '_' +
      asignacion.grupo +
      '.xlsx';

    XLSX.writeFile(
      libro,
      nombreArchivo
    );

    mensaje.textContent =
      'Plantilla descargada correctamente.';

  }catch(error){

    console.error(error);

    mensaje.textContent =
      'Error al generar plantilla.';

  }finally{

    ocultarLoader();
  }

}

// =====================================
// GENERAR PDF LISTA DE CALIFICACIONES
// MÉTODO SEGURO
// =====================================

// =====================================
// IMPRIMIR / GENERAR PDF LISTA CALIFICACIONES
// FORMATO PAGINADO
// =====================================

function generarPDFListaCalificaciones(){

  const contenido =
    document.getElementById('listaCalificacionesImprimir');

  if(!contenido){
    alert('Primero consulta una lista guardada.');
    return;
  }

  const info =
    contenido.querySelector('.info-lista-calificaciones');

  const filas =
    Array.from(
      contenido.querySelectorAll('tbody tr')
    );

  if(filas.length === 0){
    alert('No hay alumnos en la lista.');
    return;
  }

  const textoInfo =
    info ? info.innerText : '';

  const docenteMatch =
    textoInfo.match(/Docente:\s*(.*)/);

  const docente =
    docenteMatch
    ? docenteMatch[1].trim()
    : 'Docente';

  const calificaciones =
    filas.map(function(fila){

      const celdas =
        fila.querySelectorAll('td');

      return Number(celdas[2].innerText);

    }).filter(function(valor){
      return !isNaN(valor);
    });

  const total =
    calificaciones.length;

  const suma =
    calificaciones.reduce(function(a, b){
      return a + b;
    }, 0);

  const promedio =
    total > 0
    ? (suma / total).toFixed(2)
    : '0.00';

  const aprobados =
    calificaciones.filter(function(c){
      return c >= 6;
    }).length;

  const reprobados =
    calificaciones.filter(function(c){
      return c < 6;
    }).length;

  const filasPorPagina = 25;

  const paginas = [];

  for(
    let i = 0;
    i < filas.length;
    i += filasPorPagina
  ){
    paginas.push(
      filas.slice(i, i + filasPorPagina)
    );
  }

  let htmlPaginas = '';

  paginas.forEach(function(grupoFilas, indicePagina){

    const esUltima =
      indicePagina === paginas.length - 1;

    let filasHTML = '';

    grupoFilas.forEach(function(fila){
      filasHTML += fila.outerHTML;
    });

    htmlPaginas += `
      <div class="pagina">

        <div class="encabezado-documento">

          <img
            src="logo.png"
            class="logo-documento">

          <div class="titulo-documento">
            <h1>SISTEMA DE ASISTENCIA ESCOLAR</h1>
            <h2>Lista de calificaciones</h2>
          </div>

        </div>

        <div class="datos-documento">
          ${info ? info.innerHTML : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Alumno</th>
              <th>Calificación</th>
            </tr>
          </thead>

          <tbody>
            ${filasHTML}
          </tbody>
        </table>

        ${
          esUltima
          ? `
            <div class="resumen-final">
              <div>
                <strong>Promedio grupal:</strong> ${promedio}
              </div>

              <div>
                <strong>Aprobados:</strong> ${aprobados}
              </div>

              <div>
                <strong>Reprobados:</strong> ${reprobados}
              </div>
            </div>

            <div class="firma-docente">
              <div class="linea-firma"></div>
              <div>${docente}</div>
              <div>Docente</div>
            </div>
          `
          : ''
        }

      </div>
    `;

  });

  const ventana =
    window.open('', '_blank');

  ventana.document.write(`
    <html>
      <head>
        <title>Lista de calificaciones</title>

        <style>

          @page {
            size: letter portrait;
            margin: 12mm;
          }

          body {
            margin: 0;
            background: white;
            color: black;
            font-family: Arial, sans-serif;
          }

          .pagina {
            page-break-after: always;
            padding: 10mm 12mm;
            box-sizing: border-box;
          }

          .pagina:last-child {
            page-break-after: auto;
          }

          .encabezado-documento {
            position: relative;
            min-height: 72px;
            margin-bottom: 8px;
          }

          .logo-documento {
            position: absolute;
            left: 0;
            top: 0;
            width: 62px;
            height: 62px;
            object-fit: contain;
          }

          .titulo-documento {
            text-align: center;
            padding-top: 5px;
          }

          .titulo-documento h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
          }

          .titulo-documento h2 {
            margin: 6px 0 0 0;
            font-size: 17px;
            font-weight: bold;
          }

          .datos-documento {
            margin-top: 4px;
            margin-bottom: 12px;
            font-size: 13px;
            line-height: 1.25;
          }

          .datos-documento p {
            margin: 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border: 1px solid black;
            padding: 5px;
            font-size: 12px;
          }

          th {
            font-weight: bold;
            text-align: center;
          }

          td:nth-child(1),
          td:nth-child(3) {
            text-align: center;
          }

          .resumen-final {
            margin-top: 28px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            border: 1px solid black;
          }

          .resumen-final div {
            padding: 10px;
            text-align: center;
            font-size: 13px;
            border-right: 1px solid black;
          }

          .resumen-final div:last-child {
            border-right: none;
          }

          .firma-docente {
            margin-top: 60px;
            text-align: center;
            font-size: 13px;
          }

          .linea-firma {
            width: 320px;
            border-top: 1px solid black;
            margin: 0 auto 8px auto;
          }

        </style>
      </head>

      <body>
        ${htmlPaginas}

        <script>
          window.onload = function(){
            window.print();
          }
        <\/script>
      </body>
    </html>
  `);

  ventana.document.close();

}

// =====================================
// CONSULTAR RESUMEN ACADÉMICO
// =====================================

async function consultarResumenAcademico(){

  const selector =
    document.getElementById('selectorMateriaDocente');

  const periodo =
    document.getElementById('calificacionPeriodo').value;

  const contenedor =
    document.getElementById('tablaCapturaCalificaciones');

  const mensaje =
    document.getElementById('mensajeCalificaciones');

  const indice =
    selector.value;

  if(indice === ''){

    mensaje.textContent =
      'Selecciona una materia y grupo.';

    return;
  }

  if(periodo === ''){

    mensaje.textContent =
      'Selecciona un periodo.';

    return;
  }

  const asignacion =
    materiasDocente[indice];

  mostrarLoader(
    'Consultando resumen académico...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerResumenAcademico' +
        '&materia=' + encodeURIComponent(asignacion.materia) +
        '&grado=' + encodeURIComponent(asignacion.grado) +
        '&grupo=' + encodeURIComponent(asignacion.grupo) +
        '&periodo=' + encodeURIComponent(periodo)
      );

    const data =
      await respuesta.json();

    if(!data.ok){

      mensaje.textContent =
        data.mensaje || 'No se pudo obtener resumen.';

      return;
    }

    const r = data.resumen;

    contenedor.innerHTML = `
      <div class="dashboard no-pdf">

        <div class="card">
          <h3>Total alumnos</h3>
          <p>${r.total}</p>
        </div>

        <div class="card">
          <h3>Promedio</h3>
          <p>${r.promedio}</p>
        </div>

        <div class="card">
          <h3>Aprobados</h3>
          <p>${r.aprobados}</p>
        </div>

        <div class="card">
          <h3>Reprobados</h3>
          <p>${r.reprobados}</p>
        </div>

        <div class="card">
        <h3>Mayor calificación</h3>
        <p>${r.mayor ?? '-'}</p>
        <small>${(r.alumnosMayor || []).join('<br>')}</small>
      </div>

      <div class="card">
  <h3>Menor calificación</h3>
  <p>${r.menor ?? '-'}</p>
  <small>${(r.alumnosMenor || []).join('<br>')}</small>
</div>

</div>



<br>

<div class="card">
  <h3>Alertas académicas</h3>
  <div id="alertasAcademicas"></div>
</div>

<br>

<div class="card">
  <h3>Gráfica de aprobación</h3>

  <canvas id="graficaResumenAcademico"></canvas>
  <br>

<h3>Distribución de calificaciones</h3>
<canvas id="graficaDistribucionCalificaciones"></canvas>
</div>

`;

const canvas =
  document.getElementById('graficaResumenAcademico');

new Chart(canvas, {
  type: 'bar',
  data: {
    labels: ['Aprobados', 'Reprobados'],
    datasets: [{
      label: 'Alumnos',
      data: [r.aprobados, r.reprobados]
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  }
});

const canvasDistribucion =
  document.getElementById('graficaDistribucionCalificaciones');

const etiquetasDistribucion =
  Object.keys(r.distribucion).reverse();

const valoresDistribucion =
  etiquetasDistribucion.map(function(clave){
    return r.distribucion[clave];
  });

new Chart(canvasDistribucion, {
  type: 'bar',
  data: {
    labels: etiquetasDistribucion,
    datasets: [{
      label: 'Alumnos',
      data: valoresDistribucion
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  }
});

const contenedorAlertas =
  document.getElementById('alertasAcademicas');

if(r.alertas && r.alertas.length > 0){

  contenedorAlertas.innerHTML =
    r.alertas.map(function(alerta){
      return '<p>⚠ ' + alerta + '</p>';
    }).join('');

}else{

  contenedorAlertas.innerHTML =
    '<p>✅ Sin alertas académicas.</p>';

}

    mensaje.textContent =
      'Resumen académico generado correctamente.';

  }catch(error){

    console.error(error);

    mensaje.textContent =
      'Error al consultar resumen académico.';

  }finally{

    ocultarLoader();
  }

}

// =====================================
// COMPARAR GRUPOS ACADÉMICOS
// =====================================

async function compararGruposAcademicosFrontend(){

  const selector =
    document.getElementById('selectorMateriaDocente');

  const periodo =
    document.getElementById('calificacionPeriodo').value;

  const contenedor =
    document.getElementById('tablaCapturaCalificaciones');

  const mensaje =
    document.getElementById('mensajeCalificaciones');

  const indice =
    selector.value;

  if(indice === ''){
    mensaje.textContent =
      'Selecciona una materia.';
    return;
  }

  if(periodo === ''){
    mensaje.textContent =
      'Selecciona un periodo.';
    return;
  }

  const asignacion =
    materiasDocente[indice];

  mostrarLoader(
    'Comparando grupos...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=compararGruposAcademicos' +
        '&materia=' + encodeURIComponent(asignacion.materia) +
        '&periodo=' + encodeURIComponent(periodo)
      );

    const data =
      await respuesta.json();

    if(!data.ok || data.datos.length === 0){

      contenedor.innerHTML =
        '<p>No hay datos para comparar.</p>';

      return;
    }

    let html = `
      <h3>Comparación de grupos</h3>

      <p>
        <strong>Materia:</strong> ${asignacion.materia}<br>
        <strong>Periodo:</strong> ${periodo}
      </p>

      <table>
        <thead>
          <tr>
            <th>Grupo</th>
            <th>Total</th>
            <th>Promedio</th>
            <th>Aprobados</th>
            <th>Reprobados</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.datos.forEach(function(item){

      html += `
        <tr>
          <td>${item.grupo}</td>
          <td>${item.total}</td>
          <td>${item.promedio}</td>
          <td>${item.aprobados}</td>
          <td>${item.reprobados}</td>
        </tr>
      `;

    });

    html += `
        </tbody>
      </table>

      <br>

      <div class="card">
        <h3>Promedio por grupo</h3>
        <canvas id="graficaComparacionGrupos"></canvas>
      </div>
    `;

    contenedor.innerHTML = html;

    const canvas =
      document.getElementById('graficaComparacionGrupos');

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.datos.map(item => item.grupo),
        datasets: [{
          label: 'Promedio',
          data: data.datos.map(item => item.promedio)
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 10
          }
        }
      }
    });

    mensaje.textContent =
      'Comparación generada correctamente.';

  }catch(error){

    console.error(error);

    mensaje.textContent =
      'Error al comparar grupos.';

  }finally{

    ocultarLoader();
  }
}

// =====================================
// VER TOP ALUMNOS ACADÉMICO
// =====================================

async function verTopAlumnosAcademico(){

  const selector =
    document.getElementById('selectorMateriaDocente');

  const periodo =
    document.getElementById('calificacionPeriodo').value;

  const contenedor =
    document.getElementById('tablaCapturaCalificaciones');

  const mensaje =
    document.getElementById('mensajeCalificaciones');

  const indice =
    selector.value;

  if(indice === ''){
    mensaje.textContent = 'Selecciona una materia.';
    return;
  }

  if(periodo === ''){
    mensaje.textContent = 'Selecciona un periodo.';
    return;
  }

  const asignacion =
    materiasDocente[indice];

  mostrarLoader('Generando top alumnos...');

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerTopAlumnosAcademico' +
        '&materia=' + encodeURIComponent(asignacion.materia) +
        '&periodo=' + encodeURIComponent(periodo)
      );

    const data =
      await respuesta.json();

    if(!data.ok || data.datos.length === 0){
      contenedor.innerHTML = '<p>No hay datos para mostrar.</p>';
      return;
    }

    const top =
      data.datos.slice(0, 10);

    let html = `
      <h3>Top alumnos</h3>

      <p>
        <strong>Materia:</strong> ${asignacion.materia}<br>
        <strong>Periodo:</strong> ${periodo}
      </p>

      <table>
        <thead>
          <tr>
            <th>Lugar</th>
            <th>Alumno</th>
            <th>Grupo</th>
            <th>Promedio</th>
          </tr>
        </thead>
        <tbody>
    `;

    let lugarActual = 0;
let promedioAnterior = null;

top.forEach(function(item, index){

  if(promedioAnterior === null || item.promedio !== promedioAnterior){
    lugarActual = index + 1;
    promedioAnterior = item.promedio;
  }

  html += `
    <tr>
      <td>${lugarActual}</td>
      <td>${item.alumno}</td>
      <td>${item.grado} ${item.grupo}</td>
      <td>${item.promedio}</td>
    </tr>
  `;

});

    html += `
        </tbody>
      </table>

      <br>

      <div class="card">
        <h3>Gráfica top alumnos</h3>
        <canvas id="graficaTopAlumnos"></canvas>
      </div>
    `;

    contenedor.innerHTML = html;

    const canvas =
      document.getElementById('graficaTopAlumnos');

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map(item => item.alumno),
        datasets: [{
          label: 'Promedio',
          data: top.map(item => item.promedio)
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 10
          }
        }
      }
    });

    mensaje.textContent =
      'Top alumnos generado correctamente.';

  }catch(error){

    console.error(error);
    mensaje.textContent =
      'Error al generar top alumnos.';

  }finally{

    ocultarLoader();
  }
}

// =====================================
// RANKING DE GRUPOS ACADÉMICO
// =====================================

async function verRankingGruposAcademico(){

  const selector =
    document.getElementById('selectorMateriaDocente');

  const periodo =
    document.getElementById('calificacionPeriodo').value;

  const contenedor =
    document.getElementById('tablaCapturaCalificaciones');

  const mensaje =
    document.getElementById('mensajeCalificaciones');

  const indice =
    selector.value;

  if(indice === ''){
    mensaje.textContent = 'Selecciona una materia.';
    return;
  }

  if(periodo === ''){
    mensaje.textContent = 'Selecciona un periodo.';
    return;
  }

  const asignacion =
    materiasDocente[indice];

  mostrarLoader('Generando ranking de grupos...');

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=compararGruposAcademicos' +
        '&materia=' + encodeURIComponent(asignacion.materia) +
        '&periodo=' + encodeURIComponent(periodo)
      );

    const data =
      await respuesta.json();

    if(!data.ok || data.datos.length === 0){
      contenedor.innerHTML = '<p>No hay datos para mostrar.</p>';
      return;
    }

    const ranking =
      data.datos.slice().sort(function(a, b){
        return b.promedio - a.promedio;
      });

    let html = `
      <h3>Ranking de grupos</h3>

      <p>
        <strong>Materia:</strong> ${asignacion.materia}<br>
        <strong>Periodo:</strong> ${periodo}
      </p>

      <table>
        <thead>
          <tr>
            <th>Lugar</th>
            <th>Grupo</th>
            <th>Promedio</th>
            <th>Aprobados</th>
            <th>Reprobados</th>
          </tr>
        </thead>
        <tbody>
    `;

    let lugarActual = 0;
    let promedioAnterior = null;

    ranking.forEach(function(item, index){

      if(promedioAnterior === null || item.promedio !== promedioAnterior){
        lugarActual = index + 1;
        promedioAnterior = item.promedio;
      }

      html += `
        <tr>
          <td>${lugarActual}</td>
          <td>${item.grupo}</td>
          <td>${item.promedio}</td>
          <td>${item.aprobados}</td>
          <td>${item.reprobados}</td>
        </tr>
      `;

    });

    html += `
        </tbody>
      </table>

      <br>

      <div class="card">
        <h3>Gráfica ranking de grupos</h3>
        <canvas id="graficaRankingGrupos"></canvas>
      </div>
    `;

    contenedor.innerHTML = html;

    const canvas =
      document.getElementById('graficaRankingGrupos');

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ranking.map(item => item.grupo),
        datasets: [{
          label: 'Promedio',
          data: ranking.map(item => item.promedio)
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 10
          }
        }
      }
    });

    mensaje.textContent =
      'Ranking de grupos generado correctamente.';

  }catch(error){

    console.error(error);
    mensaje.textContent =
      'Error al generar ranking de grupos.';

  }finally{

    ocultarLoader();
  }
}

// =====================================
// ACTUALIZAR ESTATUS ALUMNO
// =====================================

async function actualizarEstatusAlumno(uid, fila){

  const estatus =
    document.getElementById(
      `estatus_${fila}`
    ).value;

  mostrarLoader(
    'Actualizando estatus...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=cambiarEstatusAlumno' +
        '&rfid=' + encodeURIComponent(uid) +
        '&estatus=' + encodeURIComponent(estatus) +
'&usuario=' + encodeURIComponent(usuarioActual)
      );

    const datos =
      await respuesta.json();

    if(datos.ok){

      mostrarMensajeSistema(
        'Estatus actualizado correctamente.',
        'success'
      );

    }else{

      mostrarMensajeSistema(
        datos.mensaje || 'No se pudo actualizar.',
        'error'
      );

    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error actualizando estatus.',
      'error'
    );

  }finally{

    ocultarLoader();

  }

}

// =====================================
// MOSTRAR FORMULARIO BAJA ESCOLAR
// =====================================

function registrarBajaFormal(uid){

  const contenedor =
  document.getElementById('contenidoAdmin') ||
  document.getElementById('panelAdministrador') ||
  document.getElementById('resultadoBusquedaAlumno');

  const formularioExistente =
    document.getElementById('formularioBajaEscolar');

  if(formularioExistente){
    formularioExistente.remove();
  }

  const formulario = document.createElement('div');

  formulario.id = 'formularioBajaEscolar';
  formulario.className = 'form-admin';

  formulario.innerHTML = `
    <h3>Registrar baja escolar</h3>

    <p>
      Completa la información para registrar la baja formal del alumno.
    </p>

    <label>Motivo de baja</label>
    <input
      type="text"
      id="motivoBajaEscolar"
      placeholder="Ej. Cambio de domicilio">

    <label>Observaciones</label>
    <textarea
      id="observacionesBajaEscolar"
      placeholder="Observaciones adicionales"
      rows="3"></textarea>

    <br><br>

    <button onclick="confirmarBajaFormal('${uid}')">
      Registrar baja
    </button>

    <button onclick="cancelarBajaFormal()">
      Cancelar
    </button>
  `;

  contenedor.appendChild(formulario);
}

// =====================================
// CONFIRMAR BAJA ESCOLAR FORMAL
// =====================================

async function confirmarBajaFormal(uid){

  const motivo =
    document.getElementById('motivoBajaEscolar').value.trim();

  const observaciones =
    document.getElementById('observacionesBajaEscolar').value.trim();

  if(!motivo){

    mostrarMensajeSistema(
      'Escribe el motivo de la baja.',
      'info'
    );

    return;
  }

  mostrarLoader('Registrando baja escolar...');

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=registrarBajaEscolar' +
        '&rfid=' + encodeURIComponent(uid) +
        '&motivo=' + encodeURIComponent(motivo) +
        '&observaciones=' + encodeURIComponent(observaciones) +
        '&usuario=' + encodeURIComponent(usuarioActual)
      );

    const datos =
      await respuesta.json();

    if(datos.ok){

      mostrarMensajeSistema(
        'Baja escolar registrada correctamente.',
        'exito'
      );

      const formulario =
        document.getElementById('formularioBajaEscolar');

      if(formulario){
        formulario.remove();
      }

      buscarAlumnoAdmin();

    }else{

      mostrarMensajeSistema(
        datos.mensaje || 'No se pudo registrar la baja.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error registrando baja escolar.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// CANCELAR BAJA ESCOLAR FORMAL
// =====================================

function cancelarBajaFormal(){

  const formulario =
    document.getElementById('formularioBajaEscolar');

  if(formulario){
    formulario.remove();
  }

}

// =====================================
// MOSTRAR BITÁCORA DE MOVIMIENTOS
// =====================================

async function mostrarBitacoraMovimientos(){

  const contenedor =
    document.getElementById('resultadoBusquedaAlumno');
  document.getElementById('formDocente').style.display = 'none';
  document.getElementById('formAlumno').style.display = 'none';
  document.getElementById('panelEstadisticas').style.display = 'none';
  document.getElementById('panelAlumnos').style.display = 'block';
  mostrarLoader(
    'Cargando historial de movimientos...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerBitacoraMovimientos'
      );

    const data =
      await respuesta.json();

    if(!data.ok){

      contenedor.innerHTML =
        '<p>No se pudo cargar la bitácora.</p>';

      return;
    }

    if(data.datos.length === 0){

      contenedor.innerHTML =
        '<p>No hay movimientos registrados.</p>';

      return;
    }

    let html = `
      <h3>Historial de movimientos escolares</h3>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Alumno</th>
            <th>Campo</th>
            <th>Anterior</th>
            <th>Nuevo</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.datos.forEach(function(item){

      html += `
        <tr>
          <td>${new Date(item.fecha).toLocaleString('es-MX')}</td>
          <td>${item.usuario}</td>
          <td>${item.alumno}</td>
          <td>${item.campo}</td>
          <td>${item.anterior || '-'}</td>
          <td>${item.nuevo || '-'}</td>
          <td>${item.accion}</td>
        </tr>
      `;

    });

    html += `
        </tbody>
      </table>
    `;

    contenedor.innerHTML = html;

  }catch(error){

    console.error(error);

    contenedor.innerHTML =
      '<p>Error al cargar historial de movimientos.</p>';

  }finally{

    ocultarLoader();
  }
}

// =====================================
// CALIFICACIONES REPORTE INDIVIDUAL
// =====================================

async function cargarCalificacionesReporteIndividual(uid){

  const contenedor =
    document.getElementById('resultadoReporteIndividual');

  const respuesta =
    await fetch(
      API +
      '?accion=obtenerCalificacionesReporteIndividual' +
      '&uid=' + encodeURIComponent(uid)
    );

  const data =
    await respuesta.json();

  if(!data.ok){
    return;
  }

  const alertasHTML =
  generarAlertaIntegralAlumno(data.datos);

let html = `
  <h3>Alertas académicas</h3>

  ${alertasHTML}

  <h3>Calificaciones</h3>

    <table id="tablaCalificacionesIndividual" class="tabla-individual">
      <tr>
        <th>Materia</th>
        <th>1° Periodo</th>
        <th>2° Periodo</th>
        <th>3° Periodo</th>
        <th>Promedio</th>
        <th>Situación</th>
      </tr>
  `;

  data.datos.forEach(function(item){

    html += `
      <tr>
        <td>${item.materia}</td>
        <td>${item.p1}</td>
        <td>${item.p2}</td>
        <td>${item.p3}</td>
        <td>${item.promedio}</td>
        <td>${item.situacion}</td>
      </tr>
    `;

  });

  html += `</table>`;

  contenedor.innerHTML += html;
const botonPDF =
  document.querySelector(
    'button[onclick="generarPDFIndividual()"]'
  );

if(botonPDF){
  contenedor.appendChild(botonPDF);
}

}

// =====================================
// GENERAR ALERTAS ACADÉMICAS INDIVIDUALES
// =====================================

function generarAlertasAcademicasIndividual(calificaciones){

  let alertasAltas = [];
  let alertasMedias = [];

  calificaciones.forEach(item => {

    const materia = item.materia;

    const p1 = item.p1 !== '' ? Number(item.p1) : null;
    const p2 = item.p2 !== '' ? Number(item.p2) : null;
    const p3 = item.p3 !== '' ? Number(item.p3) : null;
    const promedio = item.promedio !== '' ? Number(item.promedio) : null;

    if(p1 !== null && p2 !== null && p1 < 6 && p2 < 6){
      alertasAltas.push(
        `${materia}: reprobó 1° y 2° periodo.`
      );
    }

    if(promedio !== null && promedio < 6){
      alertasAltas.push(
        `${materia}: promedio reprobatorio.`
      );
    }

    if(promedio !== null && promedio >= 6 && promedio < 7){
      alertasMedias.push(
        `${materia}: promedio bajo.`
      );
    }

    if(
      (p1 !== null && p1 < 6) ||
      (p2 !== null && p2 < 6) ||
      (p3 !== null && p3 < 6)
    ){
      if(!(p1 !== null && p2 !== null && p1 < 6 && p2 < 6)){
        alertasMedias.push(
          `${materia}: tiene al menos un periodo reprobado.`
        );
      }
    }

  });

  if(alertasAltas.length > 0){

    return `
      <div class="alerta-riesgo alerta-alta">
        <h3>🔴 Riesgo académico alto</h3>
        <ul>
          ${alertasAltas.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if(alertasMedias.length > 0){

    return `
      <div class="alerta-riesgo alerta-media">
        <h3>🟡 Riesgo académico medio</h3>
        <ul>
          ${alertasMedias.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  return `
    <div class="alerta-riesgo alerta-baja">
      <h3>🟢 Sin riesgo académico detectado</h3>
      <p>
        El alumno no presenta indicadores académicos críticos con la información registrada.
      </p>
    </div>
  `;
}

// =====================================
// OBTENER TABLA POR TÍTULO EN REPORTE INDIVIDUAL
// =====================================

function obtenerTablaReportePorTitulo(tituloBuscado){

  const contenedor =
    document.getElementById('resultadoReporteIndividual');

  const titulos =
    contenedor.querySelectorAll('h3');

  for(let titulo of titulos){

    if(
      titulo.textContent
        .toUpperCase()
        .includes(tituloBuscado.toUpperCase())
    ){

      let elemento =
        titulo.nextElementSibling;

      while(elemento){

        if(elemento.tagName === 'TABLE'){
          return elemento;
        }

        const tabla =
          elemento.querySelector
          ? elemento.querySelector('table')
          : null;

        if(tabla){
          return tabla;
        }

        elemento =
          elemento.nextElementSibling;
      }
    }
  }

  return null;
}

// =====================================
// ALERTA INTEGRAL DEL ALUMNO
// =====================================

function generarAlertaIntegralAlumno(calificaciones){

  let alertasAltas = [];
  let alertasMedias = [];

  // ===== CALIFICACIONES =====
  calificaciones.forEach(item => {

    const materia = item.materia;

    const p1 = item.p1 !== '' ? Number(item.p1) : null;
    const p2 = item.p2 !== '' ? Number(item.p2) : null;
    const p3 = item.p3 !== '' ? Number(item.p3) : null;
    const promedio = item.promedio !== '' ? Number(item.promedio) : null;

    if(p1 !== null && p2 !== null && p1 < 6 && p2 < 6){
      alertasAltas.push(
        `${materia}: reprobó 1° y 2° periodo.`
      );
    }

    if(
  promedio !== null &&
  promedio < 6 &&
  !(p1 !== null && p2 !== null && p1 < 6 && p2 < 6)
){
  alertasAltas.push(
    `${materia}: promedio reprobatorio.`
  );
}

    if(promedio !== null && promedio >= 6 && promedio < 7){
      alertasMedias.push(
        `${materia}: promedio bajo.`
      );
    }

  });

  // ===== ASISTENCIA =====
  const tarjetas =
    document.querySelectorAll('#resultadoReporteIndividual .card');

  let faltas = 0;

  tarjetas.forEach(card => {

    const titulo =
      card.querySelector('h3')?.textContent.trim().toUpperCase();

    if(titulo === 'FALTAS'){
      faltas =
        Number(card.querySelector('p')?.textContent.trim()) || 0;
    }

  });

  if(faltas >= 15){
    alertasAltas.push(
      `Tiene ${faltas} faltas acumuladas.`
    );
  }else if(faltas >= 8){
    alertasMedias.push(
      `Tiene ${faltas} faltas acumuladas.`
    );
  }

  // ===== REPORTES ESCOLARES =====
  const tablaReportes =
    obtenerTablaReportePorTitulo('Reportes escolares');

  let totalReportes = 0;

  if(tablaReportes){
    totalReportes =
      Math.max(0, tablaReportes.querySelectorAll('tr').length - 1);
  }

  if(totalReportes >= 3){
    alertasAltas.push(
      `Tiene ${totalReportes} reportes escolares.`
    );
  }else if(totalReportes >= 1){
    alertasMedias.push(
      `Tiene ${totalReportes} reporte(s) escolar(es).`
    );
  }

  // ===== CITATORIOS =====
  const tablaCitatorios =
    obtenerTablaReportePorTitulo('Citatorios escolares');

  let totalCitatorios = 0;

  if(tablaCitatorios){
    totalCitatorios =
      Math.max(0, tablaCitatorios.querySelectorAll('tr').length - 1);
  }

  if(totalCitatorios >= 2){
    alertasAltas.push(
      `Tiene ${totalCitatorios} citatorios escolares.`
    );
  }else if(totalCitatorios === 1){
    alertasMedias.push(
      `Tiene 1 citatorio escolar.`
    );
  }

  // ===== RESULTADO FINAL =====
  if(alertasAltas.length > 0){

    return `
      <div class="alerta-riesgo alerta-alta">
        <h3>🔴 Riesgo integral alto</h3>
        <ul>
          ${alertasAltas.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if(alertasMedias.length > 0){

    return `
      <div class="alerta-riesgo alerta-media">
        <h3>🟡 Riesgo integral medio</h3>
        <ul>
          ${alertasMedias.map(a => `<li>${a}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  return `
    <div class="alerta-riesgo alerta-baja">
      <h3>🟢 Sin riesgo integral detectado</h3>
      <p>
        El alumno no presenta indicadores críticos con la información registrada.
      </p>
    </div>
  `;
}

// =====================================
// MOSTRAR PANEL RIESGO
// =====================================

function mostrarConcentradoRiesgo(){

  document.getElementById(
    'panelRiesgo'
  ).style.display = 'block';

  cargarConcentradoRiesgo();
}

// =====================================
// OCULTAR PANEL RIESGO
// =====================================

function ocultarPanelRiesgo(){

  document.getElementById(
    'panelRiesgo'
  ).style.display = 'none';
}

// =====================================
// CARGAR CONCENTRADO DE RIESGO
// =====================================

async function cargarConcentradoRiesgo(){

  mostrarLoader(
    'Analizando alumnos en riesgo...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerConcentradoRiesgo'
      );

    const data =
      await respuesta.json();

    if(!data.ok){

      mostrarMensajeSistema(
        'No se pudo cargar el concentrado.',
        'error'
      );

      return;
    }

    const totalAlto =
      data.datos.filter(item => item.riesgo === 'ALTO').length;

    const totalMedio =
      data.datos.filter(item => item.riesgo === 'MEDIO').length;

    const totalBajo =
      data.datos.filter(item => item.riesgo === 'BAJO').length;

    const conteoGrupos = {};
    const conteoMaterias = {};

    data.datos.forEach(item => {

      conteoGrupos[item.grupo] =
        (conteoGrupos[item.grupo] || 0) + 1;

      item.motivos.forEach(motivo => {

        const materia =
          motivo.includes(':')
          ? motivo.split(':')[0]
          : '';

        if(materia){
          conteoMaterias[materia] =
            (conteoMaterias[materia] || 0) + 1;
        }

      });

    });

    const grupoCritico =
      Object.keys(conteoGrupos).sort((a,b) =>
        conteoGrupos[b] - conteoGrupos[a]
      )[0] || 'Sin datos';

    const materiaCritica =
      Object.keys(conteoMaterias).sort((a,b) =>
        conteoMaterias[b] - conteoMaterias[a]
      )[0] || 'Sin datos';

    let html = `
      <div class="dashboard">

        <div class="card">
          <h3>🔴 Riesgo alto</h3>
          <p>${totalAlto}</p>
        </div>

        <div class="card">
          <h3>🟡 Riesgo medio</h3>
          <p>${totalMedio}</p>
        </div>

        <div class="card">
          <h3>🟢 Riesgo bajo</h3>
          <p>${totalBajo}</p>
        </div>

        <div class="card">
          <h3>Grupo crítico</h3>
          <p style="font-size:20px;">${grupoCritico}</p>
        </div>

        <div class="card">
          <h3>Materia crítica</h3>
          <p style="font-size:16px;">${materiaCritica}</p>
        </div>

      </div>

      <table class="tabla-individual">
        <tr>
          <th>Alumno</th>
          <th>Grupo</th>
          <th>Riesgo</th>
          <th>Puntaje</th>
          <th>Motivos</th>
        </tr>
    `;

    data.datos.forEach(item => {

      let claseRiesgo = 'riesgo-bajo';
        let textoRiesgo = '🟢 BAJO';

        if(item.riesgo === 'ALTO'){
          claseRiesgo = 'riesgo-alto';
          textoRiesgo = '🔴 ALTO';
        }else if(item.riesgo === 'MEDIO'){
          claseRiesgo = 'riesgo-medio';
          textoRiesgo = '🟡 MEDIO';
        }

      html += `
        <tr class="${claseRiesgo}">
          <td>${item.alumno}</td>
          <td>${item.grupo}</td>
          <td><strong>${textoRiesgo}</strong></td>
          <td>${item.puntaje || 0}</td>
          <td>${item.motivos.join('<br>')}</td>
        </tr>
      `;
    });

    html += `
      </table>
    `;

    document.getElementById(
      'resultadoConcentradoRiesgo'
    ).innerHTML = html;

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error cargando concentrado.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

/// =====================================
// PDF / IMPRESIÓN CONCENTRADO DE RIESGO
// =====================================

function generarPDFRiesgo(){

  const contenido =
    document.getElementById('resultadoConcentradoRiesgo');

  if(!contenido || contenido.innerHTML.trim() === ''){

    mostrarMensajeSistema(
      'Primero carga el concentrado.',
      'info'
    );

    return;
  }

  const ventana =
    window.open('', '_blank');

  ventana.document.write(`
    <html>
      <head>
        <title>Concentrado de alumnos en riesgo</title>

        <style>
          body{
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #111;
          }

          h1{
            text-align:center;
            color:#1565c0;
          }

          table{
            width:100%;
            border-collapse:collapse;
            font-size:11px;
          }

          th{
            background:#1565c0;
            color:white;
            padding:8px;
            border:1px solid #0d47a1;
          }

          td{
            border:1px solid #ccc;
            padding:7px;
            text-align:center;
          }

          .dashboard{
            display:flex;
            gap:12px;
            margin-bottom:20px;
          }

          .card{
            flex:1;
            border:1px solid #ccc;
            border-radius:10px;
            padding:12px;
            text-align:center;
          }

          .card h3{
            margin:0 0 8px;
            color:#1565c0;
            font-size:14px;
          }

          .card p{
            margin:0;
            font-size:20px;
            font-weight:bold;
          }

          .riesgo-alto td{
            background:#ffebee;
            color:#b71c1c;
          }

          .riesgo-medio td{
            background:#fff8e1;
            color:#795548;
          }

          @media print{
            @page{
              size: landscape;
              margin: 1cm;
            }
          }
        </style>
      </head>

      <body>

        <h1>CONCENTRADO DE ALUMNOS EN RIESGO</h1>

        <p>
          <strong>Fecha de emisión:</strong>
          ${new Date().toLocaleDateString('es-MX')}
        </p>

        ${contenido.innerHTML}

        <div style="margin-top:20px; text-align:center;" class="no-print">
  <button onclick="window.print()">
    Imprimir / Guardar como PDF
  </button>
</div>

      </body>
    </html>
  `);

  ventana.document.close();
}

// =====================================
// FORMULARIO SEGUIMIENTO TUTORIAL
// =====================================

function mostrarFormularioSeguimiento(
  uid,
  alumno,
  grupo,
  riesgo
){

  const html = `

    <div class="form-admin">

      <h3>
        Seguimiento tutorial
      </h3>

      <p>
        <strong>Alumno:</strong>
        ${alumno}
      </p>

      <p>
        <strong>Grupo:</strong>
        ${grupo}
      </p>

      <p>
        <strong>Riesgo:</strong>
        ${riesgo}
      </p>

      <input
        type="text"
        id="seguimientoResponsable"
        placeholder="Responsable">

      <input
        type="date"
        id="seguimientoRevision">

      <textarea
        id="seguimientoAccion"
        rows="4"
        style="width:100%;"
        placeholder="¿Qué hizo la escuela?">
      </textarea>

      <textarea
        id="seguimientoNotas"
        rows="6"
        style="width:100%;"
        placeholder="Seguimiento posterior, acuerdos, llamadas, entrevistas, compromisos, observaciones, etc.">
      </textarea>

      <button onclick="guardarSeguimientoTutorial(
        '${uid}',
        '${alumno}',
        '${grupo}',
        '${riesgo}'
      )">
        Guardar seguimiento
      </button>

    </div>
  `;

  document.getElementById(
    'resultadoConcentradoRiesgo'
  ).insertAdjacentHTML(
    'beforeend',
    html
  );
}

// =====================================
// MOSTRAR ALUMNOS CRÍTICOS
// =====================================

async function mostrarAlumnosCriticos(){

  mostrarLoader(
    'Analizando alumnos críticos...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerConcentradoRiesgo'
      );

    const data =
      await respuesta.json();

    if(!data.ok){

      mostrarMensajeSistema(
        'No se pudo cargar alumnos críticos.',
        'error'
      );

      return;
    }

    const criticos =
      data.datos.filter(item =>
        item.riesgo === 'ALTO'
      );

    let html = `
      <h3>Alumnos críticos</h3>

      <p class="mensaje-vacio">
        Se muestran únicamente alumnos con riesgo alto.
      </p>
    `;

    if(criticos.length === 0){

      html += `
        <p class="mensaje-vacio">
          No hay alumnos críticos registrados.
        </p>
      `;

      document.getElementById(
        'resultadoConcentradoRiesgo'
      ).innerHTML = html;

      return;
    }

    html += `
      <table class="tabla-individual">
        <tr>
          <th>Alumno</th>
          <th>Grupo</th>
          <th>Motivos críticos</th>
        </tr>
    `;

    criticos.forEach(item => {

      html += `
        <tr class="riesgo-alto">
          <td>${item.alumno}</td>
          <td>${item.grupo}</td>
          <td>${item.motivos.join('<br>')}</td>
        </tr>
      `;

    });

    html += `
      </table>
    `;

    document.getElementById(
      'resultadoConcentradoRiesgo'
    ).innerHTML = html;

    mostrarMensajeSistema(
      'Alumnos críticos cargados correctamente.',
      'exito'
    );

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error cargando alumnos críticos.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// PDF / IMPRESIÓN ALUMNOS CRÍTICOS
// =====================================

async function generarPDFAlumnosCriticos(){

  mostrarLoader(
    'Preparando PDF de alumnos críticos...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerConcentradoRiesgo'
      );

    const data =
      await respuesta.json();

    if(!data.ok){

      mostrarMensajeSistema(
        'No se pudieron cargar alumnos críticos.',
        'error'
      );

      return;
    }

    const criticos =
      data.datos.filter(item =>
        item.riesgo === 'ALTO'
      );

    if(criticos.length === 0){

      mostrarMensajeSistema(
        'No hay alumnos críticos para imprimir.',
        'info'
      );

      return;
    }

    let filas = '';

    criticos.forEach(item => {

      filas += `
        <tr>
          <td>${item.alumno}</td>
          <td>${item.grupo}</td>
          <td>${item.motivos.join('<br>')}</td>
        </tr>
      `;

    });

    const ventana =
      window.open('', '_blank');

    ventana.document.write(`
      <html>
        <head>
          <title>Alumnos críticos</title>

          <style>
            body{
              font-family: Arial, sans-serif;
              padding:20px;
              color:#111;
            }

            h1{
              text-align:center;
              color:#b71c1c;
              margin-bottom:6px;
            }

            .subtitulo{
              text-align:center;
              font-size:13px;
              margin-bottom:20px;
            }

            .resumen{
              border:1px solid #b71c1c;
              background:#ffebee;
              color:#b71c1c;
              padding:12px;
              border-radius:10px;
              margin-bottom:18px;
              font-weight:bold;
              text-align:center;
            }

            table{
              width:100%;
              border-collapse:collapse;
              font-size:12px;
            }

            th{
              background:#b71c1c;
              color:white;
              padding:8px;
              border:1px solid #7f0000;
            }

            td{
              border:1px solid #ccc;
              padding:8px;
              vertical-align:top;
              text-align:left;
            }

            td:nth-child(2){
              text-align:center;
              width:90px;
            }

            .no-print{
              margin-top:20px;
              text-align:center;
            }

            .no-print button{
              padding:12px 20px;
              background:#1565c0;
              color:white;
              border:none;
              border-radius:8px;
              font-weight:bold;
              cursor:pointer;
            }

            @media print{
              .no-print{
                display:none;
              }

              @page{
                size: landscape;
                margin:1cm;
              }
            }
          </style>
        </head>

        <body>

          <h1>ALUMNOS CRÍTICOS</h1>

          <div class="subtitulo">
            Fecha de emisión:
            ${new Date().toLocaleDateString('es-MX')}
          </div>

          <div class="resumen">
            Total de alumnos en riesgo alto:
            ${criticos.length}
          </div>

          <table>
            <tr>
              <th>Alumno</th>
              <th>Grupo</th>
              <th>Motivos críticos</th>
            </tr>

            ${filas}

          </table>

          <div class="no-print">
            <button onclick="window.print()">
              Imprimir / Guardar como PDF
            </button>
          </div>

        </body>
      </html>
    `);

    ventana.document.close();

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error generando PDF de alumnos críticos.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// PANEL SEGUIMIENTO TUTORIAL
// =====================================

function mostrarPanelSeguimientoTutorial(){

  const panel =
    document.getElementById('panelSeguimientoTutorial');

  if(panel){
    panel.style.display = 'block';
  }
}

function ocultarPanelSeguimientoTutorial(){

  const panel =
    document.getElementById('panelSeguimientoTutorial');

  if(panel){
    panel.style.display = 'none';
  }

  const resultado =
    document.getElementById('resultadoBusquedaSeguimiento');

  if(resultado){
    resultado.innerHTML = '';
  }
}

// =====================================
// BUSCAR ALUMNO PARA SEGUIMIENTO
// =====================================

async function buscarAlumnoSeguimientoTutorial(){

  const busqueda =
    document.getElementById('buscarAlumnoSeguimiento').value.trim();

  if(!busqueda){

    mostrarMensajeSistema(
      'Escribe un nombre o UID.',
      'info'
    );

    return;
  }

  mostrarLoader('Buscando alumno...');

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=buscarAlumno' +
        '&busqueda=' + encodeURIComponent(busqueda)
      );

    const alumnos =
      await respuesta.json();

    let html = '';

    alumnos.forEach(alumno => {

      html += `
        <div class="resultado-alumno">

          <p><strong>${alumno.nombre}</strong></p>
          <p>UID: ${alumno.uid}</p>
          <p>Grupo: ${alumno.grado} ${alumno.grupo}</p>
          <p>Estatus: ${alumno.estatus}</p>

          <button onclick="abrirFormularioSeguimientoTutorial(
            '${alumno.uid}',
            '${alumno.nombre}',
            '${alumno.grado}',
            '${alumno.grupo}'
          )">
            Registrar seguimiento
          </button>

        </div>
      `;
    });

    document.getElementById(
      'resultadoBusquedaSeguimiento'
    ).innerHTML =
      html || '<p>No se encontraron alumnos.</p>';

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error buscando alumno.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// ABRIR FORMULARIO SEGUIMIENTO TUTORIAL
// =====================================

function abrirFormularioSeguimientoTutorial(
  uid,
  alumno,
  grado,
  grupo
){

  const contenedor =
    document.getElementById(
      'resultadoBusquedaSeguimiento'
    );

  contenedor.innerHTML = `

    <div class="form-admin">

      <h3>
        Seguimiento tutorial
      </h3>

      <p>
        <strong>Alumno:</strong>
        ${alumno}
      </p>

      <p>
        <strong>UID:</strong>
        ${uid}
      </p>

      <p>
        <strong>Grupo:</strong>
        ${grado} ${grupo}
      </p>

      <input
  type="text"
  id="seguimientoResponsable"
  placeholder="Responsable">

<label>
  Próxima revisión
</label>

<input
  type="date"
  id="seguimientoRevision">

<label>
  Acción realizada
</label>

<textarea
  id="seguimientoAccion"
  rows="4"
  placeholder="Describa la acción realizada por la escuela"></textarea>

<label>
  Seguimiento posterior
</label>

<textarea
  id="seguimientoNotas"
  rows="6"
  placeholder="Acuerdos, llamadas, reuniones, compromisos, observaciones, etc."></textarea>
      
  
  <button onclick="guardarSeguimientoTutorial(
        '${uid}',
        '${alumno}',
        '${grado}',
        '${grupo}'
      )">
        Guardar seguimiento
      </button>

      <button onclick="buscarAlumnoSeguimientoTutorial()">
        Regresar
      </button>

    <hr>

<div
  id="historialSeguimientoTutorial">
</div>
    
    </div>
  `;

  verSeguimientoTutorial(uid);
}

// =====================================
// GUARDAR SEGUIMIENTO TUTORIAL
// =====================================

async function guardarSeguimientoTutorial(
  uid,
  alumno,
  grado,
  grupo
){

  const responsable =
    document.getElementById(
      'seguimientoResponsable'
    ).value.trim();

  const revision =
    document.getElementById(
      'seguimientoRevision'
    ).value;

  const accion =
    document.getElementById(
      'seguimientoAccion'
    ).value.trim();

  const notas =
    document.getElementById(
      'seguimientoNotas'
    ).value.trim();

  if(
    !responsable ||
    !accion
  ){

    mostrarMensajeSistema(
      'Responsable y acción son obligatorios.',
      'info'
    );

    return;
  }

  mostrarLoader(
    'Guardando seguimiento...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=registrarSeguimientoTutorial' +
        '&uid=' + encodeURIComponent(uid) +
        '&alumno=' + encodeURIComponent(alumno) +
        '&grado=' + encodeURIComponent(grado) +
        '&grupo=' + encodeURIComponent(grupo) +
        '&nivelRiesgo=' + encodeURIComponent('PENDIENTE') +
        '&accionRealizada=' + encodeURIComponent(accion) +
        '&responsable=' + encodeURIComponent(responsable) +
        '&proximaRevision=' + encodeURIComponent(revision) +
        '&seguimientoPosterior=' + encodeURIComponent(notas) +
        '&usuario=' + encodeURIComponent(usuarioActual)
      );

    const datos =
      await respuesta.json();

    if(datos.ok){

      mostrarMensajeSistema(
        'Seguimiento registrado correctamente.',
        'exito'
      );

      ocultarPanelSeguimientoTutorial();

    }else{

      mostrarMensajeSistema(
        datos.mensaje ||
        'No se pudo guardar.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error guardando seguimiento.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// VER HISTORIAL SEGUIMIENTO
// =====================================

async function verSeguimientoTutorial(uid){

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerSeguimientoTutorial' +
        '&uid=' +
        encodeURIComponent(uid)
      );

    const datos =
      await respuesta.json();

    if(!datos.ok){
      return;
    }

    let html = `
      <h4>
        Historial de seguimiento
      </h4>
    `;

    if(datos.datos.length === 0){

      html += `
        <p>
          Sin seguimientos registrados.
        </p>
      `;

    }else{

      html += `
        <table class="tabla-individual">

          <tr>
            <th>Fecha</th>
            <th>Responsable</th>
            <th>Acción</th>
            <th>Próxima revisión</th>
            <th>Seguimiento posterior</th>
          </tr>
      `;

      datos.datos.forEach(item => {
        const fechaRegistro =
  item.fecha
  ? new Date(item.fecha).toLocaleString('es-MX')
  : '';

const fechaRevision =
  item.revision
  ? new Date(item.revision).toLocaleDateString('es-MX')
  : '';
        html += `
          <tr>
              <td>${fechaRegistro}</td>
              <td>${item.responsable}</td>
              <td>${item.accion}</td>
              <td>${fechaRevision}</td>
              <td>${item.notas || ''}</td>
          </tr>
        `;
      });

      html += `
        </table>
      `;

    }

    document.getElementById(
      'historialSeguimientoTutorial'
    ).innerHTML = html;

  }catch(error){

    console.error(error);

  }

}

// =====================================
// SEGUIMIENTO TUTORIAL EN REPORTE INDIVIDUAL
// =====================================

async function cargarSeguimientoTutorialReporteIndividual(uid){

  const contenedor =
    document.getElementById('resultadoReporteIndividual');

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerSeguimientoTutorial' +
        '&uid=' + encodeURIComponent(uid)
      );

    const data =
      await respuesta.json();

    if(!data.ok){
      return;
    }

    let html = `
      <h3>Seguimiento tutorial</h3>
    `;

    if(data.datos.length === 0){

      html += `
        <p class="mensaje-vacio">
          Sin seguimientos tutoriales registrados.
        </p>
      `;

    }else{

      html += `
        <table id="tablaSeguimientoTutorialIndividual" class="tabla-individual">
          <tr>
            <th>Fecha</th>
            <th>Responsable</th>
            <th>Acción</th>
            <th>Próxima revisión</th>
            <th>Seguimiento posterior</th>
          </tr>
      `;

      data.datos.forEach(item => {

        const fechaRegistro =
          item.fecha
          ? new Date(item.fecha).toLocaleString('es-MX')
          : '';

        const fechaRevision =
          item.revision
          ? new Date(item.revision).toLocaleDateString('es-MX')
          : '';

        html += `
          <tr>
            <td>${fechaRegistro}</td>
            <td>${item.responsable || ''}</td>
            <td>${item.accion || ''}</td>
            <td>${fechaRevision}</td>
            <td>${item.notas || ''}</td>
          </tr>
        `;
      });

      html += `</table>`;
    }

    contenedor.innerHTML += html;

  }catch(error){

    console.error(error);
  }
}

// =====================================
// CARGAR DASHBOARD INSTITUCIONAL
// =====================================

async function cargarDashboardInstitucional(){

  mostrarLoader(
    'Cargando dashboard institucional...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerDashboardInstitucional'
      );

    const data =
      await respuesta.json();

      data.topReportes =
  Array.isArray(data.topReportes)
  ? data.topReportes
  : [];

data.topCitatorios =
  Array.isArray(data.topCitatorios)
  ? data.topCitatorios
  : [];

data.topGruposRiesgo =
  Array.isArray(data.topGruposRiesgo)
  ? data.topGruposRiesgo
  : [];

data.proximasRevisiones =
  Array.isArray(data.proximasRevisiones)
  ? data.proximasRevisiones
  : [];

    if(!data.ok){

      mostrarMensajeSistema(
        'No se pudo cargar el dashboard institucional.',
        'error'
      );

      return;
    }

    const topReportesHTML =
      data.topReportes.length === 0
      ? '<tr><td>Sin datos</td></tr>'
      : data.topReportes.map(item => `
          <tr>
            <td>${item.alumno}</td>
            <td><strong>${item.total}</strong></td>
          </tr>
        `).join('');

    const topCitatoriosHTML =
      data.topCitatorios.length === 0
      ? '<tr><td>Sin datos</td></tr>'
      : data.topCitatorios.map(item => `
          <tr>
            <td>${item.alumno}</td>
            <td><strong>${item.total}</strong></td>
          </tr>
        `).join('');

    const topGruposHTML =
      data.topGruposRiesgo.length === 0
      ? '<tr><td>Sin datos</td></tr>'
      : data.topGruposRiesgo.map(item => `
          <tr>
            <td>${item.grupo}</td>
            <td>
              🔴 ${item.alto}
              <br>
              🟡 ${item.medio}
            </td>
          </tr>
        `).join('');

    const revisionesHTML =
      data.proximasRevisiones.length === 0
      ? '<tr><td>Sin datos</td></tr>'
      : data.proximasRevisiones.map(item => `
          <tr>
            <td>
              ${new Date(item.fecha).toLocaleDateString('es-MX')}
              <br>
              ${item.alumno}
              <br>
              <small>${item.responsable}</small>
            </td>
          </tr>
        `).join('');

    let html = `
      <h3>Dashboard institucional</h3>

      <div class="dashboard">

        <div class="card">
          <h3>Alumnos activos</h3>
          <p>${data.alumnosActivos}</p>
        </div>

        <div class="card">
          <h3>Alumnos baja</h3>
          <p>${data.alumnosBaja}</p>
        </div>

        <div class="card">
          <h3>🔴 Riesgo alto</h3>
          <p>${data.riesgoAlto}</p>
        </div>

        <div class="card">
          <h3>🟡 Riesgo medio</h3>
          <p>${data.riesgoMedio}</p>
        </div>

        <div class="card">
          <h3>Reportes escolares</h3>
          <p>${data.reportes}</p>
        </div>

        <div class="card">
          <h3>Citatorios</h3>
          <p>${data.citatorios}</p>
        </div>

        <div class="card">
          <h3>Seguimientos</h3>
          <p>${data.seguimientos}</p>
        </div>

        <div class="card">
          <h3>Revisiones pendientes</h3>
          <p>${data.revisionesPendientes}</p>
        </div>

      </div>

      <h3>Indicadores de atención prioritaria</h3>

      <div class="dashboard">

        <div class="card">
          <h3>Top reportes</h3>
          <table>
            ${topReportesHTML}
          </table>
        </div>

        <div class="card">
          <h3>Top citatorios</h3>
          <table>
            ${topCitatoriosHTML}
          </table>
        </div>

        <div class="card">
          <h3>Grupos con mayor riesgo</h3>
          <table>
            ${topGruposHTML}
          </table>
        </div>

        <div class="card">
          <h3>Próximas revisiones</h3>
          <table>
            ${revisionesHTML}
          </table>
        </div>

      </div>
    `;

    document.getElementById(
      'resultadoDashboardInstitucional'
    ).innerHTML = html;

    document.getElementById(
      'panelEstadisticas'
    ).style.display = 'block';

    mostrarMensajeSistema(
      'Dashboard institucional cargado.',
      'exito'
    );

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error cargando dashboard institucional.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}
 

function obtenerFechaCompleta(){

  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ];

  const hoy = new Date();

  return (
    hoy.getDate() +
    ' de ' +
    meses[hoy.getMonth()] +
    ' de ' +
    hoy.getFullYear()
  );
}


// =====================================
// PDF EJECUTIVO DASHBOARD INSTITUCIONAL
// =====================================

async function generarPDFDashboardInstitucional(){

  const ventana =
    window.open('', '_blank');

  if(!ventana){

    mostrarMensajeSistema(
      'El navegador bloqueó la ventana emergente. Permite popups para generar el PDF.',
      'error'
    );

    return;
  }

  ventana.document.write(`
    <html>
      <body style="font-family:Arial; padding:30px;">
        <h2>Preparando PDF ejecutivo institucional...</h2>
        <p>Espera un momento.</p>
      </body>
    </html>
  `);

  ventana.document.close();

  mostrarLoader(
    'Preparando PDF ejecutivo institucional...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=obtenerDashboardInstitucional'
      );

    const data =
      await respuesta.json();

    if(!data.ok){

      mostrarMensajeSistema(
        'No se pudo generar el PDF institucional.',
        'error'
      );

      return;
    }

    data.topReportes =
      Array.isArray(data.topReportes)
      ? data.topReportes
      : [];

    data.topCitatorios =
      Array.isArray(data.topCitatorios)
      ? data.topCitatorios
      : [];

    data.topGruposRiesgo =
      Array.isArray(data.topGruposRiesgo)
      ? data.topGruposRiesgo
      : [];

    data.proximasRevisiones =
      Array.isArray(data.proximasRevisiones)
      ? data.proximasRevisiones
      : [];

    const filasReportes =
      data.topReportes.length === 0
      ? '<tr><td colspan="2">Sin datos</td></tr>'
      : data.topReportes.map(item => `
          <tr>
            <td>${item.alumno}</td>
            <td>${item.total}</td>
          </tr>
        `).join('');

    const filasCitatorios =
      data.topCitatorios.length === 0
      ? '<tr><td colspan="2">Sin datos</td></tr>'
      : data.topCitatorios.map(item => `
          <tr>
            <td>${item.alumno}</td>
            <td>${item.total}</td>
          </tr>
        `).join('');

    const filasGrupos =
      data.topGruposRiesgo.length === 0
      ? '<tr><td colspan="4">Sin datos</td></tr>'
      : data.topGruposRiesgo.map(item => `
          <tr>
            <td>${item.grupo}</td>
            <td>${item.alto}</td>
            <td>${item.medio}</td>
            <td>${item.total}</td>
          </tr>
        `).join('');

    const filasRevisiones =
      data.proximasRevisiones.length === 0
      ? '<tr><td colspan="4">Sin datos</td></tr>'
      : data.proximasRevisiones.map(item => `
          <tr>
            <td>${new Date(item.fecha).toLocaleDateString('es-MX')}</td>
            <td>${item.alumno}</td>
            <td>${item.grupo}</td>
            <td>${item.responsable || ''}</td>
          </tr>
        `).join('');

    
    ventana.document.write(`
      <html>
        <head>
          <title>PDF Ejecutivo Institucional</title>

          <style>
            body{
              font-family: Arial, sans-serif;
              padding:24px;
              color:#111;
            }

            h1{
              text-align:center;
              color:#1565c0;
              margin-bottom:4px;
              font-size:28px;
            }

            .subtitulo{
              text-align:center;
              font-size:13px;
              margin-bottom:22px;
            }

            h2{
              color:#1565c0;
              border-bottom:3px solid #1565c0;
              padding-bottom:5px;
              margin-top:22px;
              font-size:18px;
            }

            table{
              width:100%;
              border-collapse:collapse;
              margin-bottom:18px;
              font-size:12px;
            }

            th{
              background:#1565c0;
              color:white;
              padding:8px;
              border:1px solid #0d47a1;
              text-align:center;
            }

            td{
              border:1px solid #ccc;
              padding:7px;
              text-align:center;
            }

            .tabla-indicadores td:first-child{
              text-align:left;
              font-weight:bold;
              width:70%;
            }

            .tabla-indicadores td:last-child{
              font-size:18px;
              font-weight:bold;
              color:#1565c0;
              width:30%;
            }

            .grid-doble{
              display:grid;
              grid-template-columns:1fr 1fr;
              gap:18px;
            }

            .bloque{
              page-break-inside:avoid;
              break-inside:avoid;
            }

            .nota{
              font-size:11px;
              margin-top:18px;
              color:#555;
              text-align:center;
            }

            .no-print{
              text-align:center;
              margin-top:20px;
            }

            .no-print button{
              padding:12px 22px;
              background:#1565c0;
              color:white;
              border:none;
              border-radius:8px;
              font-weight:bold;
              cursor:pointer;
            }

            @media print{
              .no-print{
                display:none;
              }

              @page{
                size: letter portrait;
                margin:1cm;
              }
            }
          </style>
        </head>

        <body>

          <h1>DASHBOARD INSTITUCIONAL</h1>

<div
  style="
    text-align:center;
    font-size:16px;
    font-weight:bold;
    margin-top:10px;
  ">
  CENTRO ESCOLAR GENERAL RAFAEL ÁVILA CAMACHO
</div>

<div
  style="
    text-align:center;
    font-size:13px;
    margin-top:4px;
  ">
  Nivel Secundaria
</div>

<div
  style="
    text-align:center;
    font-size:13px;
    margin-bottom:20px;
  ">
  San Martín Texmelucan, Puebla
</div>

<div class="subtitulo">
  Fecha de emisión:
  ${obtenerFechaCompleta()}
</div>

          <h2>Indicadores generales</h2>

          <table class="tabla-indicadores">
            <tr>
              <td>Alumnos activos</td>
              <td>${data.alumnosActivos}</td>
            </tr>
            <tr>
              <td>Alumnos en baja</td>
              <td>${data.alumnosBaja}</td>
            </tr>
            <tr>
              <td>Riesgo alto</td>
              <td>${data.riesgoAlto}</td>
            </tr>
            <tr>
              <td>Riesgo medio</td>
              <td>${data.riesgoMedio}</td>
            </tr>
            <tr>
              <td>Reportes escolares</td>
              <td>${data.reportes}</td>
            </tr>
            <tr>
              <td>Citatorios escolares</td>
              <td>${data.citatorios}</td>
            </tr>
            <tr>
              <td>Seguimientos tutoriales</td>
              <td>${data.seguimientos}</td>
            </tr>
            <tr>
              <td>Revisiones pendientes</td>
              <td>${data.revisionesPendientes}</td>
            </tr>
          </table>

          <h2>Indicadores de atención prioritaria</h2>

          <div class="grid-doble">

            <div class="bloque">
              <h2>Top reportes</h2>
              <table>
                <tr>
                  <th>Alumno</th>
                  <th>Total</th>
                </tr>
                ${filasReportes}
              </table>
            </div>

            <div class="bloque">
              <h2>Top citatorios</h2>
              <table>
                <tr>
                  <th>Alumno</th>
                  <th>Total</th>
                </tr>
                ${filasCitatorios}
              </table>
            </div>

          </div>

          <div class="grid-doble">

            <div class="bloque">
              <h2>Grupos con mayor riesgo</h2>
              <table>
                <tr>
                  <th>Grupo</th>
                  <th>Alto</th>
                  <th>Medio</th>
                  <th>Total</th>
                </tr>
                ${filasGrupos}
              </table>
            </div>

            <div class="bloque">
              <h2>Próximas revisiones</h2>
              <table>
                <tr>
                  <th>Fecha</th>
                  <th>Alumno</th>
                  <th>Grupo</th>
                  <th>Responsable</th>
                </tr>
                ${filasRevisiones}
              </table>
            </div>

          </div>

          <p class="nota">
  Documento generado por el Sistema Integral de Gestión Escolar.
  <br>
  Uso institucional.
</p>

          <div class="no-print">
            <button onclick="window.print()">
              Imprimir / Guardar como PDF
            </button>
          </div>

        </body>
      </html>
    `);

    ventana.document.close();

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error generando PDF ejecutivo institucional.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// AGENDA INSTITUCIONAL
// =====================================

async function cargarAgendaInstitucional(){

  mostrarLoader('Cargando agenda institucional...');

  try{

    const respuesta =
      await fetch(
        API + '?accion=obtenerAgendaInstitucional'
      );

    const data =
      await respuesta.json();

    if(!data.ok){
      mostrarMensajeSistema(
        'No se pudo cargar la agenda institucional.',
        'error'
      );
      return;
    }

    const crearFilas = lista => {

      if(!lista || lista.length === 0){
        return `
          <tr>
            <td colspan="5">Sin revisiones registradas</td>
          </tr>
        `;
      }

      return lista.map(item => `
        <tr>
          <td>${item.alumno}</td>
          <td>${item.grupo}</td>
          <td>${item.revision}</td>
          <td>${item.responsable || 'Sin responsable'}</td>
          <td>${item.accion || 'Sin descripción'}</td>
        </tr>
      `).join('');
    };

    const html = `
      <h2>Agenda institucional</h2>

      <div class="dashboard agenda-dashboard">

        <div class="card agenda-vencida">
          <h3>🔴 Revisiones vencidas</h3>
          <p>${data.vencidas.length}</p>
        </div>

        <div class="card agenda-hoy">
          <h3>🟡 Revisiones para hoy</h3>
          <p>${data.hoy.length}</p>
        </div>

        <div class="card agenda-semana">
          <h3>🟢 Esta semana</h3>
          <p>${data.semana.length}</p>
        </div>

      </div>

      <h3>🔴 Revisiones vencidas</h3>
      <table>
        <tr>
          <th>Alumno</th>
          <th>Grupo</th>
          <th>Fecha</th>
          <th>Responsable</th>
          <th>Acción</th>
        </tr>
        ${crearFilas(data.vencidas)}
      </table>

      <h3>🟡 Revisiones para hoy</h3>
      <table>
        <tr>
          <th>Alumno</th>
          <th>Grupo</th>
          <th>Fecha</th>
          <th>Responsable</th>
          <th>Acción</th>
        </tr>
        ${crearFilas(data.hoy)}
      </table>

      <h3>🟢 Revisiones de esta semana</h3>
      <table>
        <tr>
          <th>Alumno</th>
          <th>Grupo</th>
          <th>Fecha</th>
          <th>Responsable</th>
          <th>Acción</th>
        </tr>
        ${crearFilas(data.semana)}
      </table>
    `;

    document.getElementById(
      'resultadoDashboardInstitucional'
    ).innerHTML = html;

    document.getElementById(
      'panelEstadisticas'
    ).style.display = 'block';

    mostrarMensajeSistema(
      'Agenda institucional cargada.',
      'exito'
    );

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error cargando agenda institucional.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// PORTAL DE PADRES V1.0
// =====================================

async function buscarAlumnoPortalPadres(){

  const busqueda =
  document.getElementById('uidPadre').value.trim();

const password =
  document.getElementById('passwordPadre').value.trim();

  const contenedor =
    document.getElementById('resultadoPortalPadres');

  if(!busqueda || !password){

    contenedor.innerHTML = `
      <p class="mensaje-vacio">
        Escribe el UID y la contraseña.
      </p>
    `;

    return;
  }

  contenedor.innerHTML = `
    <p class="mensaje-vacio">
      Buscando información del alumno...
    </p>
  `;

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=loginPadres' +
'&uid=' +
encodeURIComponent(busqueda) +
'&password=' +
encodeURIComponent(password)
      );

    const alumnos =
      await respuesta.json();

    if(!Array.isArray(alumnos) || alumnos.length === 0){

      contenedor.innerHTML = `
        <p class="mensaje-vacio">
          No se encontró información con ese dato.
        </p>
      `;

      return;
    }

    let html = `
      <h2>Resultados encontrados</h2>
      <div class="resultados-individuales">
    `;

    alumnos.forEach(alumno => {

      html += `
        <div class="card-individual">

          <h3>${alumno.nombre}</h3>

          <p><strong>UID:</strong> ${alumno.uid}</p>
          <p><strong>Grupo:</strong> ${alumno.grupo}</p>

         <button onclick="cargarPortalPadresAlumno(
  '${alumno.uid}',
  '${alumno.nombre}',
  '${alumno.grado}',
  '${alumno.grupo}',
  '${password}'
)">

        </div>
      `;
    });

    html += `</div>`;

    contenedor.innerHTML = html;

  }catch(error){

    console.error(error);

    contenedor.innerHTML = `
      <p class="mensaje-vacio">
        Error al consultar información.
      </p>
    `;
  }
}


async function cargarPortalPadresAlumno(uid, alumno, grado, grupo, passwordActual){

  const contenedor =
    document.getElementById('resultadoPortalPadres');

    if(passwordActual === 'escuela'){

  contenedor.innerHTML = `
    <div class="portal-alumno">

      <h2>Cambio obligatorio de contraseña</h2>

      <p>
        Por seguridad, debes cambiar la contraseña inicial antes de consultar la información del alumno.
      </p>

      <input
        type="password"
        id="nuevoPasswordPadre"
        placeholder="Nueva contraseña">

      <input
        type="password"
        id="confirmarPasswordPadre"
        placeholder="Confirmar contraseña">

      <button onclick="guardarNuevoPasswordPadre(
        '${uid}',
        '${passwordActual}',
        '${alumno}',
        '${grado}',
        '${grupo}'
      )">
        Guardar contraseña
      </button>

    </div>
  `;

  return;
}

  contenedor.innerHTML = `
    <p class="mensaje-vacio">
      Cargando historial del alumno...
    </p>
  `;

  try{

    const historial =
      await fetch(
        API +
        '?accion=historialIndividual' +
        '&uid=' +
        encodeURIComponent(uid)
      ).then(r => r.json());

    const reportes =
      await fetch(
        API +
        '?accion=reportesPorAlumno' +
        '&uid=' +
        encodeURIComponent(uid) +
        '&alumno=' +
        encodeURIComponent(alumno)
      ).then(r => r.json());

    const justificantes =
      await fetch(
        API +
        '?accion=justificantesPorAlumno' +
        '&uid=' +
        encodeURIComponent(uid) +
        '&alumno=' +
        encodeURIComponent(alumno)
      ).then(r => r.json());

    const citatorios =
      await fetch(
        API +
        '?accion=citatoriosPorAlumno' +
        '&uid=' +
        encodeURIComponent(uid) +
        '&alumno=' +
        encodeURIComponent(alumno)
      ).then(r => r.json());

    const calificaciones =
      await fetch(
        API +
        '?accion=obtenerCalificacionesReporteIndividual' +
        '&uid=' +
        encodeURIComponent(uid)
      ).then(r => r.json());

      const riesgo =
  await fetch(
    API +
    '?accion=obtenerRiesgoAlumnoPadre' +
    '&uid=' +
    encodeURIComponent(uid)
  ).then(r => r.json());

    let html = `
      <div class="portal-alumno">

        <h2>${historial.nombre || alumno}</h2>

        <p><strong>UID:</strong> ${uid}</p>
<p><strong>Grupo:</strong> ${grupo || historial.grupo || 'Sin grupo'}</p>

        <div class="dashboard">
          <div class="card">
            <h3>Asistencias</h3>
            <p>${historial.asistencias || 0}</p>
          </div>

          <div class="card">
            <h3>Faltas</h3>
            <p>${historial.faltas || 0}</p>
          </div>

          <div class="card">
            <h3>Promedio</h3>
            <p>${historial.porcentaje || 0}%</p>
          </div>
        </div>

        ${bloqueRiesgoPortal(riesgo)}

        <h3>Calificaciones</h3>
        ${tablaCalificacionesPortal(calificaciones.datos || [])}

        <h3>Reportes escolares</h3>
        ${tablaReportesPortal(reportes.reportes || [])}

        <h3>Justificantes</h3>
        ${tablaJustificantesPortal(justificantes.justificantes || [])}

        <h3>Citatorios</h3>
        ${tablaCitatoriosPortal(citatorios.citatorios || [])}

        <br>

        <button onclick="buscarAlumnoPortalPadres()">
          Regresar
        </button>

      </div>
    `;

    contenedor.innerHTML = html;

  }catch(error){

    console.error(error);

    contenedor.innerHTML = `
      <p class="mensaje-vacio">
        Error cargando información del alumno.
      </p>
    `;
  }
}


function tablaCalificacionesPortal(datos){

  if(datos.length === 0){
    return `<p class="mensaje-vacio">Sin calificaciones registradas.</p>`;
  }

  let html = `
    <table>
      <tr>
        <th>Materia</th>
        <th>1°</th>
        <th>2°</th>
        <th>3°</th>
        <th>Promedio</th>
        <th>Situación</th>
      </tr>
  `;

  datos.forEach(item => {
    html += `
      <tr>
        <td>${item.materia}</td>
        <td>${item.p1}</td>
        <td>${item.p2}</td>
        <td>${item.p3}</td>
        <td>${item.promedio}</td>
        <td>${item.situacion}</td>
      </tr>
    `;
  });

  html += `</table>`;

  return html;
}


function tablaReportesPortal(datos){

  if(datos.length === 0){
    return `<p class="mensaje-vacio">Sin reportes escolares.</p>`;
  }

  let html = `
    <table>
      <tr>
        <th>Fecha</th>
        <th>Tipo</th>
        <th>Docente</th>
        <th>Descripción</th>
        <th>Acción</th>
      </tr>
  `;

  datos.forEach(item => {
    html += `
      <tr>
        <td>${formatearFechaReporte(item.fecha)}</td>
        <td>${item.tipoReporte || ''}</td>
        <td>${item.docente || ''}</td>
        <td>${item.descripcion || ''}</td>
        <td>${item.accionTomada || ''}</td>
      </tr>
    `;
  });

  html += `</table>`;

  return html;
}


function tablaJustificantesPortal(datos){

  if(datos.length === 0){
    return `<p class="mensaje-vacio">Sin justificantes registrados.</p>`;
  }

  let html = `
    <table>
      <tr>
        <th>Fecha</th>
        <th>Tipo</th>
        <th>Motivo</th>
        <th>Solicita</th>
      </tr>
  `;

  datos.forEach(item => {
    html += `
      <tr>
        <td>${formatearFechaReporte(item.fecha)}</td>
        <td>${item.tipoJustificante || ''}</td>
        <td>${item.motivo || ''}</td>
        <td>${item.solicita || ''}</td>
      </tr>
    `;
  });

  html += `</table>`;

  return html;
}


function tablaCitatoriosPortal(datos){

  if(datos.length === 0){
    return `<p class="mensaje-vacio">Sin citatorios registrados.</p>`;
  }

  let html = `
    <table>
      <tr>
        <th>Fecha cita</th>
        <th>Hora</th>
        <th>Motivo</th>
        <th>Responsable</th>
        <th>Seguimiento</th>
      </tr>
  `;

  datos.forEach(item => {
    html += `
      <tr>
        <td>${formatearFechaReporte(item.fechaCitatorio)}</td>
        <td>${formatearHoraCorta(item.horaCitatorio)}</td>
        <td>${item.motivo || ''}</td>
        <td>${item.responsable || ''}</td>
        <td>${item.seguimiento || ''}</td>
      </tr>
    `;
  });

  html += `</table>`;

  return html;
}

// =====================================
// GUARDAR NUEVA CONTRASEÑA PADRE
// =====================================

async function guardarNuevoPasswordPadre(
  uid,
  passwordActual,
  alumno,
  grado,
  grupo
){

  const nuevo =
    document.getElementById('nuevoPasswordPadre').value.trim();

  const confirmar =
    document.getElementById('confirmarPasswordPadre').value.trim();

  const contenedor =
    document.getElementById('resultadoPortalPadres');

  if(!nuevo || !confirmar){

    contenedor.innerHTML += `
      <p class="mensaje-vacio">
        Escribe y confirma la nueva contraseña.
      </p>
    `;

    return;
  }

  if(nuevo !== confirmar){

    contenedor.innerHTML += `
      <p class="mensaje-vacio">
        Las contraseñas no coinciden.
      </p>
    `;

    return;
  }

  if(nuevo.length < 6){

    contenedor.innerHTML += `
      <p class="mensaje-vacio">
        La contraseña debe tener mínimo 6 caracteres.
      </p>
    `;

    return;
  }

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=cambiarPasswordPadre' +
        '&uid=' +
        encodeURIComponent(uid) +
        '&passwordActual=' +
        encodeURIComponent(passwordActual) +
        '&passwordNuevo=' +
        encodeURIComponent(nuevo)
      );

    const datos =
      await respuesta.json();

    if(!datos.success){

      contenedor.innerHTML += `
        <p class="mensaje-vacio">
          ${datos.mensaje || 'No se pudo cambiar la contraseña.'}
        </p>
      `;

      return;
    }

    await cargarPortalPadresAlumno(
      uid,
      alumno,
      grado,
      grupo,
      nuevo
    );

  }catch(error){

    console.error(error);

    contenedor.innerHTML += `
      <p class="mensaje-vacio">
        Error al cambiar la contraseña.
      </p>
    `;
  }
}

// =====================================
// RECUPERAR CONTRASEÑA PADRE
// =====================================

function mostrarRecuperarPasswordPadre(){

  document.getElementById('resultadoPortalPadres').innerHTML = `
    <div class="portal-alumno">

      <h2>Recuperar contraseña</h2>

      <input
        type="text"
        id="uidRecuperacionPadre"
        placeholder="UID del alumno">

      <button onclick="solicitarCodigoPasswordPadre()">
        Enviar código al correo
      </button>

      <hr>

      <input
        type="text"
        id="codigoRecuperacionPadre"
        placeholder="Código recibido">

      <input
        type="password"
        id="nuevoPasswordRecuperacionPadre"
        placeholder="Nueva contraseña">

      <button onclick="restablecerPasswordPadre()">
        Restablecer contraseña
      </button>

      <p id="mensajeRecuperacionPadre"></p>

    </div>
  `;
}

async function solicitarCodigoPasswordPadre(){

  const uid =
    document.getElementById('uidRecuperacionPadre').value.trim();

  const mensaje =
    document.getElementById('mensajeRecuperacionPadre');

  mensaje.textContent = 'Enviando código...';

  const respuesta =
    await fetch(
      API +
      '?accion=solicitarCodigoPasswordPadre' +
      '&uid=' +
      encodeURIComponent(uid)
    );

  const datos = await respuesta.json();

  mensaje.textContent = datos.mensaje;
}

async function restablecerPasswordPadre(){

  const uid =
    document.getElementById('uidRecuperacionPadre').value.trim();

  const codigo =
    document.getElementById('codigoRecuperacionPadre').value.trim();

  const nuevoPassword =
    document.getElementById('nuevoPasswordRecuperacionPadre').value.trim();

  const mensaje =
    document.getElementById('mensajeRecuperacionPadre');

  mensaje.textContent = 'Restableciendo contraseña...';

  const respuesta =
    await fetch(
      API +
      '?accion=restablecerPasswordPadre' +
      '&uid=' +
      encodeURIComponent(uid) +
      '&codigo=' +
      encodeURIComponent(codigo) +
      '&nuevoPassword=' +
      encodeURIComponent(nuevoPassword)
    );

  const datos = await respuesta.json();

  mensaje.textContent = datos.mensaje;
}

// =====================================
// ACTUALIZAR DATOS DEL TUTOR ADMIN
// =====================================

async function actualizarDatosTutorAdmin(uid){

  const nombreTutor =
    document.getElementById('nombreTutor_' + uid).value.trim();

  const telefonoTutor =
    document.getElementById('telefonoTutor_' + uid).value.trim();

  const correoTutor =
    document.getElementById('correoTutor_' + uid).value.trim();

  mostrarLoader(
    'Actualizando datos del tutor...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=actualizarDatosTutor' +
        '&uid=' + encodeURIComponent(uid) +
        '&nombreTutor=' + encodeURIComponent(nombreTutor) +
        '&telefonoTutor=' + encodeURIComponent(telefonoTutor) +
        '&correoTutor=' + encodeURIComponent(correoTutor)
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Datos del tutor actualizados correctamente.',
        'exito'
      );

    }else{

      mostrarMensajeSistema(
        datos.mensaje || 'No se pudieron actualizar los datos del tutor.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error al actualizar datos del tutor.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// PANEL ALERTAS A PADRES
// INASISTENCIAS
// =====================================

async function cargarPanelAlertasPadres(){

  mostrarLoader('Cargando alertas a padres...');

  try{

    const respuesta =
      await fetch(
        API + '?accion=obtenerPanelAlertasInasistencia'
      );

    const datos =
      await respuesta.json();

    if(!datos.success){
      mostrarMensajeSistema(
        'No se pudo cargar el panel de alertas.',
        'error'
      );
      return;
    }

    let resumenGrupos = '';

    Object.keys(datos.grupos || {}).forEach(grupo => {
      resumenGrupos += `
        <div class="card">
          <h3>${grupo}</h3>
          <p>${datos.grupos[grupo]}</p>
        </div>
      `;
    });

    let filas = '';

    if(!datos.alumnos || datos.alumnos.length === 0){

      filas = `
        <tr>
          <td colspan="6">
            No hay inasistencias registradas.
          </td>
        </tr>
      `;

    }else{

      datos.alumnos.forEach(a => {

        filas += `
          <tr>
            <td>${a.alumno}</td>
            <td>${a.grupoCompleto}</td>
            <td>${a.tutor || 'Sin tutor'}</td>
            <td>${a.telefono || 'Sin teléfono'}</td>
            <td>${a.correo || 'Sin correo'}</td>
            <td>
              ${
                a.correo
                ? '<span class="badge-ok">Listo</span>'
                : '<span class="badge-error">Sin correo</span>'
              }
            </td>

            <td>
              <button onclick="justificarInasistenciaAlerta(${a.filaAlmacen})">
                Justificar
              </button>
            </td>
          </tr>
        `;
      });
    }

    const botonDeshabilitado =
      datos.yaEnviado ||
      !datos.fecha ||
      datos.total === 0;

    const textoBoton =
      datos.yaEnviado
      ? 'Correos ya enviados'
      : 'Enviar correos de inasistencia';

    const html = `
      <h3>Alertas a padres</h3>

      <div class="dashboard">

        <div class="card">
          <h3>Fecha detectada</h3>
          <p>${datos.fecha || 'Sin fecha'}</p>
        </div>

        <div class="card">
          <h3>Inasistencias</h3>
          <p>${datos.total}</p>
        </div>

        <div class="card">
          <h3>Con correo</h3>
          <p>${datos.conCorreo}</p>
        </div>

        <div class="card">
          <h3>Sin correo</h3>
          <p>${datos.sinCorreo}</p>
        </div>

      </div>

      <h4>Resumen por grupo</h4>

      <div class="dashboard">
        ${resumenGrupos || '<p class="mensaje-vacio">Sin datos por grupo.</p>'}
      </div>

        ${
        datos.yaEnviado
        ? '<p class="mensaje-vacio">Los correos para esta fecha ya fueron enviados. El botón se habilitará cuando exista una nueva fecha de asistencia.</p>'
        : ''
      }

      <div class="tabla-container">
        <table>
          <tr>
            <th>Alumno</th>
            <th>Grupo</th>
            <th>Tutor</th>
            <th>Teléfono</th>
            <th>Correo</th>
            <th>Estatus</th>
            <th>Acción</th>
          </tr>
          ${filas}
        </table>
      </div>

      <div class="acciones-alertas-padres">
        <button
          id="btnEnviarCorreosInasistencia"
          onclick="enviarCorreosInasistenciaPadres()"
          ${botonDeshabilitado ? 'disabled' : ''}>
          ${textoBoton}
        </button>
      </div>
    `;

    const panelEstadisticas =
      document.getElementById('panelEstadisticas');

    const contenedor =
      document.getElementById('resultadoDashboardInstitucional');

    if(panelEstadisticas){
      panelEstadisticas.style.display = 'block';
    }

    if(contenedor){
      contenedor.innerHTML = html;
    }

    mostrarMensajeSistema(
      'Panel de alertas cargado.',
      'exito'
    );

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error cargando alertas a padres.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// ENVIAR CORREOS DE INASISTENCIA
// =====================================

async function enviarCorreosInasistenciaPadres(){

  const confirmar =
    await mostrarModalConfirmacion(
      'Enviar correos',
      '¿Deseas enviar los correos de inasistencia a los tutores con correo registrado?'
    );

  if(!confirmar){
    return;
  }

  const boton =
    document.getElementById('btnEnviarCorreosInasistencia');

  if(boton){
    boton.disabled = true;
    boton.textContent = 'Enviando correos...';
  }

  mostrarLoader('Enviando correos de inasistencia...');

  try{

    const usuarioActivo =
      JSON.parse(
        localStorage.getItem('usuarioActivo')
      );

    const usuario =
      usuarioActivo && usuarioActivo.nombre
      ? usuarioActivo.nombre
      : 'ADMIN';

    const respuesta =
      await fetch(
        API +
        '?accion=enviarCorreosInasistenciaPadres' +
        '&usuario=' +
        encodeURIComponent(usuario)
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Correos enviados: ' +
        datos.enviados +
        '. Sin correo: ' +
        datos.sinCorreo,
        'exito'
      );

      await cargarPanelAlertasPadres();

    }else{

      mostrarMensajeSistema(
        datos.mensaje || 'No se pudieron enviar los correos.',
        'error'
      );

      await cargarPanelAlertasPadres();
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error enviando correos de inasistencia.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// JUSTIFICAR INASISTENCIA DESDE PANEL
// =====================================

async function justificarInasistenciaAlerta(fila){

  mostrarLoader('Justificando inasistencia...');

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=justificarInasistenciaAlerta' +
        '&fila=' +
        encodeURIComponent(fila)
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Inasistencia justificada correctamente.',
        'exito'
      );

      await cargarPanelAlertasPadres();

    }else{

      mostrarMensajeSistema(
        datos.mensaje || 'No se pudo justificar.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error al justificar inasistencia.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}

// =====================================
// RIESGO ESCOLAR PORTAL PADRES
// =====================================

function bloqueRiesgoPortal(riesgo){

  if(!riesgo || !riesgo.ok){

    return `
      <p class="mensaje-vacio">
        No se pudo calcular el riesgo escolar.
      </p>
    `;
  }

  let icono = '🟢';
  let texto = 'SIN RIESGO';

  if(riesgo.riesgo === 'ALTO'){
    icono = '🔴';
    texto = 'RIESGO ALTO';
  }else if(riesgo.riesgo === 'MEDIO'){
    icono = '🟡';
    texto = 'RIESGO MEDIO';
  }else if(riesgo.riesgo === 'BAJO'){
    icono = '🟢';
    texto = 'RIESGO BAJO';
  }

  let motivos = '';

  (riesgo.motivos || []).forEach(item => {

    motivos += `
      <li>${item}</li>
    `;
  });

  return `
    <div class="card-riesgo-padre">

      <h3>
        🚦 Riesgo escolar
      </h3>

      <h2>
        ${icono} ${texto}
      </h2>

      <p>
        <strong>Puntaje:</strong>
        ${riesgo.puntaje || 0}
      </p>

      ${
        motivos
        ? `
          <ul>
            ${motivos}
          </ul>
        `
        : `
          <p>
            Sin factores de riesgo detectados.
          </p>
        `
      }

    </div>
  `;
}

// =====================================
// ENVIAR ALERTAS DE RIESGO ALTO
// =====================================

async function enviarAlertasRiesgoAlto(){

  mostrarLoader(
    'Enviando alertas de riesgo alto...'
  );

  try{

    const respuesta =
      await fetch(
        API +
        '?accion=enviarAlertasRiesgoAlto'
      );

    const datos =
      await respuesta.json();

    if(datos.success){

      mostrarMensajeSistema(
        'Alertas enviadas: ' +
        datos.enviados +
        '. Sin correo: ' +
        datos.sinCorreo,
        'exito'
      );

    }else{

      mostrarMensajeSistema(
        datos.mensaje ||
        'No se pudieron enviar las alertas.',
        'error'
      );
    }

  }catch(error){

    console.error(error);

    mostrarMensajeSistema(
      'Error enviando alertas de riesgo alto.',
      'error'
    );

  }finally{

    ocultarLoader();
  }
}