// backend/index.js
const express = require('express');
const cors = require('cors');
const ExcelJS = require('exceljs');
const { obtenerDiasDelMes } = require('./services/calendarioService');
const { generarMatrizTurnos } = require('./services/motorTurnos');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Endpoint para generar y previsualizar el cuadro en JSON
app.post('/api/previsualizar-cuadro', (req, res) => {
  try {
    const { anio, mes, modalidad, asignaciones, empleados } = req.body;
    const dias = obtenerDiasDelMes(anio, mes);
    const matriz = generarMatrizTurnos(dias, empleados, asignaciones, modalidad);

    res.json({ dias, matriz });
  } catch (error) {
    console.error('Error en /api/previsualizar-cuadro:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Endpoint para exportar a Excel la matriz (ya editada en React)
app.post('/api/exportar-excel', async (req, res) => {
  try {
    const { anio, mes, dias, matriz } = req.body;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Turnos ${mes}-${anio}`);

    // Encabezados dinámicos
    sheet.columns = [
      { header: 'Empleado', key: 'nombre', width: 25 },
      ...dias.map(d => ({
        header: `${d.numero}${d.esFestivo || d.esDomingo ? ' (F)' : ''}`,
        key: `d_${d.numero}`,
        width: 22
      })),
      { header: 'Total Horas', key: 'totalHoras', width: 15 }
    ];

    // Estilo de la fila de encabezados
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).font = { bold: true };
    headerRow.getCell(dias.length + 2).font = { bold: true };

    dias.forEach((d, idx) => {
      const cell = headerRow.getCell(idx + 2);
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: d.esDomingo || d.esFestivo ? 'FFFFCCCC' : 'FFD9E1F2' }
      };
    });

    // Colores para novedades de ausencia
    const coloresNovedades = {
      'INCAPACIDAD': 'FFFFE699',         // Amarillo suave
      'LICENCIA MATERNIDAD': 'FFF8CBAD', // Durazno suave
      'CALAMIDAD': 'FFFFD966',           // Ámbar suave
      'VACACIONES': 'FFBDD7EE'           // Azul celeste
    };

    // Agregar filas por empleado con los datos finales
    matriz.forEach(emp => {
      const fila = {
        nombre: emp.nombre,
        totalHoras: emp.horasAcumuladas
      };

      dias.forEach(d => {
        fila[`d_${d.numero}`] = emp.cronograma[d.numero] || 'LIBRE';
      });

      const row = sheet.addRow(fila);
      row.getCell(1).font = { bold: true };
      row.getCell(dias.length + 2).font = { bold: true };
      row.getCell(dias.length + 2).alignment = { horizontal: 'center' };

      // Aplicar estilo a cada celda del día
      dias.forEach((d, idx) => {
        const valor = emp.cronograma[d.numero] || 'LIBRE';
        const cell = row.getCell(idx + 2);
        cell.alignment = { horizontal: 'center' };

        if (coloresNovedades[valor]) {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: coloresNovedades[valor] }
          };
        } else if (valor !== 'LIBRE' && valor !== 'DESCANSO') {
          // Turnos activos en verde muy suave
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2EFDA' }
          };
        }
      });
    });

    // Agregar bordes finos a toda la tabla
    sheet.eachRow(row => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
        };
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Cuadro_Turnos_${mes}_${anio}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error en /api/exportar-excel:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API corriendo en el puerto ${PORT}`));