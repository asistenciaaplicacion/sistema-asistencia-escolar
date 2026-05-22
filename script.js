const API =
'https://script.google.com/macros/s/AKfycbxR3dZQcwTibnulKd13RI_dRQcPebT2PXvKspWjs25JzuhtHJKNbaBGT7WMNE9HcWb1/exec';

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

    let asistencias = 0;
    let faltas = 0;

    html += `
      <tr>
        <td>${index + 1}</td>
        <td class="nombre">${alumno}</td>
    `;

    datos.dias.forEach(dia => {

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
    datos.alumnos.length;

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

  document.getElementById('sistema').style.display = 'none';

  if(document.getElementById('panelAdmin')){

    document.getElementById('panelAdmin').style.display = 'none';
  }

  verificarSesion();
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
        '&grupo=' + encodeURIComponent(grupo)
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

          <button onclick="editarAlumno(${alumno.fila})">
            Guardar cambios
          </button>

          <button onclick="eliminarAlumno(${alumno.fila})">
            Eliminar
          </button>

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

  console.log('DATOS HISTORIAL INDIVIDUAL:', datos);

  if(!datos){

    document.getElementById('resultadoReporteIndividual').innerHTML = `
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

  let html = `
    <div class="dashboard">

      <div class="card">
        <h3>Alumno</h3>
        <p style="font-size:18px;">${datos.nombre || 'Sin nombre'}</p>
      </div>

      <div class="card">
        <h3>Grupo</h3>
        <p>${datos.grupo || 'Sin grupo'}</p>
      </div>

      <div class="card">
        <h3>Asistencias</h3>
        <p>${datos.asistencias || 0}</p>
      </div>

      <div class="card">
        <h3>Faltas</h3>
        <p>${datos.faltas || 0}</p>
      </div>

      <div class="card">
        <h3>Promedio</h3>
        <p>${datos.porcentaje || 0}%</p>
      </div>

    </div>

    <h3>Historial por fechas</h3>
  `;

  if(historial.length === 0){

    html += `
      <p class="mensaje-vacio">
        Este alumno todavía no tiene historial registrado.
      </p>
    `;

  }else{

    html += `
      <table class="tabla-individual">
        <tr>
          <th>Fecha</th>
          <th>Estado</th>
        </tr>
    `;

    historial.forEach(registro => {

      let estado =
        String(registro.estado || '').toUpperCase();

      let clase =
        (
          estado === 'ASISTENCIA' ||
          estado === 'PRESENTE' ||
          estado === 'ASISTIO' ||
          estado === 'ASISTIÓ'
        )
        ? 'presente'
        : 'falta';

      let fechaTexto = '';

      if(registro.fecha){

        fechaTexto =
          new Date(registro.fecha).toLocaleDateString('es-MX');

      }else{

        fechaTexto = 'Sin fecha';
      }

      html += `
        <tr>
          <td>${fechaTexto}</td>
          <td class="${clase}">${registro.estado || 'Sin estado'}</td>
        </tr>
      `;
    });

    html += `</table>`;
  }

  document.getElementById(
    'resultadoReporteIndividual'
  ).innerHTML = html;
}



function mostrarHistorialIndividual(datos){

  const contenedor =
    document.getElementById('resultadoReporteIndividual');

  if(!contenedor){
    console.error('No existe resultadoReporteIndividual');
    return;
  }

  console.log(
    'PINTANDO HISTORIAL:',
    datos
  );

  let historial =
    Array.isArray(datos.historial)
    ? datos.historial
    : [];

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
        <p>${datos.asistencias || 0}</p>
      </div>

      <div class="card">
        <h3>Faltas</h3>
        <p>${datos.faltas || 0}</p>
      </div>

      <div class="card">
        <h3>Promedio</h3>
        <p>${datos.porcentaje || 0}%</p>
      </div>

    </div>

    <h3>Historial por fechas</h3>
  `;

  if(historial.length === 0){

    html += `
      <p class="mensaje-vacio">
        Este alumno no tiene registros en Almacenamiento.
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

      let estado =
        String(registro.estado || '').toUpperCase();

      let clase =
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

      html += `
        <tr>
          <td>${fechaTexto}</td>
          
<td>

  ${
    registro.hora
    ? (
        isNaN(new Date(registro.hora).getTime())
        ? 'S/I'
        : new Date(registro.hora)
            .toLocaleTimeString(
              'es-MX',
              {
                hour:'2-digit',
                minute:'2-digit',
                second:'2-digit'
              }
            )
      )
    : 'N/D'
  }

</td>


          <td class="${clase}">${registro.estado || ''}</td>
          <td>${registro.puntualidad || ''}</td>
        </tr>
      `;
    });

    html += `</table>`;
  }

  contenedor.innerHTML = html;
}

function generarPDFIndividual(){

  const contenedor = document.getElementById('resultadoReporteIndividual');

  if(!contenedor || contenedor.innerHTML.trim() === ''){
    alert('Primero busca un alumno para generar su PDF individual.');
    return;
  }

  const tablaOriginal = contenedor.querySelector('table');

  if(!tablaOriginal){
    alert('No se encontró la tabla del historial individual.');
    return;
  }

  const tablaHistorial = tablaOriginal.cloneNode(true);

  tablaHistorial.querySelectorAll('*').forEach(el => {
    el.removeAttribute('style');
    el.removeAttribute('class');
  });

  tablaHistorial.style.width = '100%';
  tablaHistorial.style.borderCollapse = 'collapse';
  tablaHistorial.style.tableLayout = 'fixed';

  const fechaEmision = new Date().toLocaleDateString('es-MX');
  const folio = 'IND-' + Date.now();

  const reporte = document.createElement('div');

  reporte.innerHTML = `
    <div id="pdfIndividual">

      <style>
        #pdfIndividual{
          font-family: Arial, sans-serif;
          padding: 12px;
          color: #1f2937;
          background: white;
        }

        .encabezado-individual{
          display:flex;
          align-items:center;
          border-bottom:4px solid #1565c0;
          padding-bottom:12px;
          margin-bottom:22px;
        }

        .logo-individual{
          width:85px;
          height:85px;
          object-fit:contain;
          margin-right:20px;
        }

        .titulo-individual h1{
          margin:0;
          color:#1565c0;
          font-size:22px;
        }

        .titulo-individual h2{
          margin:4px 0;
          font-size:17px;
          color:#1f2937;
        }

        .titulo-individual p{
          margin:0;
          font-size:12px;
        }

        #pdfIndividual h3{
          color:#1f2937;
          font-size:18px;
          margin:0 0 10px 0;
        }

        #pdfIndividual table{
          width:100% !important;
          border-collapse:collapse !important;
          table-layout:fixed !important;
          font-size:10px !important;
        }

        #pdfIndividual th{
          background:#1565c0 !important;
          color:white !important;
          padding:6px 3px !important;
          border:1px solid #0d47a1 !important;
          text-align:center !important;
          font-size:10px !important;
          white-space:normal !important;
        }

        #pdfIndividual td{
          padding:6px 3px !important;
          border:1px solid #cbd5e1 !important;
          text-align:center !important;
          font-size:10px !important;
          white-space:normal !important;
          word-break:normal !important;
        }

        #pdfIndividual th:nth-child(1),
        #pdfIndividual td:nth-child(1){
          width:23% !important;
        }

        #pdfIndividual th:nth-child(2),
        #pdfIndividual td:nth-child(2){
          width:24% !important;
        }

        #pdfIndividual th:nth-child(3),
        #pdfIndividual td:nth-child(3){
          width:26% !important;
        }

        #pdfIndividual th:nth-child(4),
        #pdfIndividual td:nth-child(4){
          width:27% !important;
        }

        .validacion-individual{
          margin-top:28px;
          padding-top:15px;
          border-top:3px solid #1565c0;
          display:flex;
          justify-content:space-between;
          align-items:center;
        }

        .validacion-individual p{
          font-size:12px;
          margin:6px 0;
        }

        #qrPDFIndividual{
          width:110px;
          height:110px;
        }
      </style>

      <div class="encabezado-individual">
        <img src="logo.png" class="logo-individual">

        <div class="titulo-individual">
          <h1>SISTEMA DE ASISTENCIA ESCOLAR</h1>
          <h2>Reporte Individual de Asistencia</h2>
          <p>
            Fecha de emisión: ${fechaEmision}<br>
            Folio: ${folio}
          </p>
        </div>
      </div>

      <h3>Historial por fechas</h3>

      <div id="tablaPDFIndividual"></div>

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

  reporte.querySelector('#tablaPDFIndividual').appendChild(tablaHistorial);

  const urlValidacion =
  window.location.origin +
  window.location.pathname.replace('index.html', '') +
  'verificar.html?folio=' +
  encodeURIComponent(folio);

new QRCode(
  reporte.querySelector('#qrPDFIndividual'),
  {
    text: urlValidacion,
    width: 110,
    height: 110
  }
);

  setTimeout(async () => {

  const opciones = {
    margin: [0.2, 0.2, 0.2, 0.2],
    filename: `Reporte_Individual_${folio}.pdf`,
    image: {
      type: 'jpeg',
      quality: 0.98
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0
    },
    jsPDF: {
      unit: 'in',
      format: 'letter',
      orientation: 'landscape'
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy']
    }
  };

  try{

    mostrarLoader('Guardando PDF individual en Drive...');

    const usuarioActivo =
      JSON.parse(
        localStorage.getItem('usuarioActivo')
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

    if(reporte){
      document.body.removeChild(reporte);
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

      <select id="reporteGrado">
        <option value="">Selecciona grado</option>
        <option>Primero</option>
        <option>Segundo</option>
        <option>Tercero</option>
      </select>

      <select id="reporteGrupo">
        <option value="">Selecciona grupo</option>
        <option>A</option>
        <option>B</option>
        <option>C</option>
      </select>

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

  if(modulo === 'bitacora'){

    contenedor.innerHTML = `
      <div class="modulo-academico">
        <h3>Bitácora</h3>
        <p class="mensaje-vacio">
          Módulo pendiente. Aquí se registrarán observaciones generales,
          seguimientos y acuerdos institucionales.
        </p>
      </div>
    `;

    return;
  }

  if(modulo === 'pases'){

    contenedor.innerHTML = `
      <div class="modulo-academico">
        <h3>Pase de salida</h3>
        <p class="mensaje-vacio">
          Módulo pendiente. Solo Dirección y Administración podrán generar pases.
        </p>
      </div>
    `;

    return;
  }

  if(modulo === 'justificantes'){

    contenedor.innerHTML = `
      <div class="modulo-academico">
        <h3>Justificantes</h3>
        <p class="mensaje-vacio">
          Módulo pendiente. Aquí se registrarán justificantes de inasistencia.
        </p>
      </div>
    `;

    return;
  }

  if(modulo === 'calificaciones'){

    contenedor.innerHTML = `
      <div class="modulo-academico">
        <h3>Calificaciones</h3>
        <p class="mensaje-vacio">
          Módulo pendiente. Aquí se capturarán o importarán calificaciones.
        </p>
      </div>
    `;

    return;
  }
}

let alumnosReporteEncontrados = [];

async function buscarAlumnoParaReporte(){

  const input =
    document.getElementById('buscadorAlumnoReporte');

  const contenedor =
    document.getElementById('resultadosAlumnoReporte');

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

    alumnosReporteEncontrados =
      Array.isArray(alumnos)
      ? alumnos
      : [];

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

let alumnosReporteEncontrados = [];

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

function seleccionarAlumnoReporte(index){

  const alumno = alumnosReporteEncontrados[index];

  if(!alumno) return;

  document.getElementById('reporteUID').value = alumno.uid || '';
  document.getElementById('reporteAlumno').value = alumno.nombre || '';
  document.getElementById('reporteGrado').value = alumno.grado || '';
  document.getElementById('reporteGrupo').value = alumno.grupoLetra || '';
  document.getElementById('buscadorAlumnoReporte').value = alumno.nombre || '';
  document.getElementById('resultadosAlumnoReporte').innerHTML = '';
}
