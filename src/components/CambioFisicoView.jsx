import { Feather } from '@expo/vector-icons';
import { FlatList, View } from 'react-native';
import { Text } from './base/Texto';
import { TOKENS } from '../theme/tokens';
import { styles } from './cambioFisico/estilos';
import { useEstadoCambioFisico } from './cambioFisico/useEstadoCambioFisico';
import { useAccionesCambioFisico } from './cambioFisico/useAccionesCambioFisico';
import { crearRenderizarTarjetaCambio } from './cambioFisico/renderizarTarjetaCambio';
import { crearRenderCabeceraLista } from './cambioFisico/renderCabeceraLista';
import { crearRenderModalBascula } from './cambioFisico/renderModalBascula';

export default function CambioFisicoView({
  cambiosExternos,
  entrenamientosHoy = [],
  comidasHoy = [],
  perfilExterno = null,
  perfilUsuario = null,
  onCambioFisicoActualizado,
  onPerfilActualizado,
  onAbrirEdicionPerfil,
}) {
  const { fechaSeleccionada, setFechaSeleccionada, setRegistrosInternos, setPerfilInterno, fotosSeleccionadas, setFotosSeleccionadas, avisoLimiteFotos, setAvisoLimiteFotos, mensajeError, setMensajeError, analizando, setAnalizando, textoProgreso, setTextoProgreso, comparandoId, setComparandoId, avisoBorradoId, setAvisoBorradoId, modalVisible, setModalVisible, pesoSeleccionadoKg, setPesoSeleccionadoKg, hora12, setHora12, minutos12, setMinutos12, periodo12, setPeriodo12, momentoDia, setMomentoDia, fotosBase64PorRegistroRef, timerAvisoRef, esHoy, listaRegistros, perfilActivo, edadInfo, tiempoEntrenoInfo, pesoBasePerfil, alturaCmPerfil, alturaMetrosPerfil, sexoPerfil, diasConFoto, registrosDelDia, ultimoPesoConocido } = useEstadoCambioFisico({ cambiosExternos, perfilExterno, perfilUsuario });
  const { cambiarObjetivo, abrirCamara, abrirGaleria, quitarFotoSeleccionada, limpiarFotosSeleccionadas, abrirMenuInteractivoPreAnalisis, ajustarPesoBascula, ajustarHora12, ajustarMinutos12, alternarPeriodo12, confirmarYAnalizarCambioFisico, manejarComparacionEnUnToque, mostrarAvisoToqueCorto, solicitarConfirmacionBorrado } = useAccionesCambioFisico({ alturaCmPerfil, alturaMetrosPerfil, analizando, comidasHoy, comparandoId, entrenamientosHoy, esHoy, fotosBase64PorRegistroRef, fotosSeleccionadas, hora12, listaRegistros, minutos12, momentoDia, onCambioFisicoActualizado, onPerfilActualizado, perfilActivo, periodo12, pesoBasePerfil, pesoSeleccionadoKg, setAnalizando, setAvisoBorradoId, setAvisoLimiteFotos, setComparandoId, setFotosSeleccionadas, setHora12, setMensajeError, setMinutos12, setModalVisible, setMomentoDia, setPerfilInterno, setPeriodo12, setPesoSeleccionadoKg, setRegistrosInternos, setTextoProgreso, sexoPerfil, timerAvisoRef, ultimoPesoConocido });

  // Las funciones de render leen sus variables de este contexto al ejecutarse (Spec 022).
  const ctxRender = {};
  const renderizarTarjetaCambio = crearRenderizarTarjetaCambio(ctxRender);
  const renderCabeceraLista = crearRenderCabeceraLista(ctxRender);
  const renderModalBascula = crearRenderModalBascula(ctxRender);

  const diferenciaContraBase =
    Math.round((pesoSeleccionadoKg - pesoBasePerfil) * 10) / 10;

  const textoDiferenciaBase =
    diferenciaContraBase === 0
      ? `En tu peso base (${pesoBasePerfil.toFixed(1)} kg)`
      : `${diferenciaContraBase > 0 ? '+' : ''}${diferenciaContraBase.toFixed(
          1
        )} kg vs base (${pesoBasePerfil.toFixed(1)} kg)`;

  Object.assign(ctxRender, { abrirCamara, abrirGaleria, abrirMenuInteractivoPreAnalisis, ajustarHora12, ajustarMinutos12, ajustarPesoBascula, alternarPeriodo12, alturaCmPerfil, alturaMetrosPerfil, analizando, avisoBorradoId, avisoLimiteFotos, cambiarObjetivo, comparandoId, confirmarYAnalizarCambioFisico, diasConFoto, edadInfo, esHoy, fechaSeleccionada, fotosSeleccionadas, hora12, limpiarFotosSeleccionadas, listaRegistros, manejarComparacionEnUnToque, mensajeError, minutos12, modalVisible, momentoDia, mostrarAvisoToqueCorto, onAbrirEdicionPerfil, perfilActivo, periodo12, pesoSeleccionadoKg, quitarFotoSeleccionada, registrosDelDia, setFechaSeleccionada, setModalVisible, setMomentoDia, sexoPerfil, solicitarConfirmacionBorrado, textoDiferenciaBase, textoProgreso, tiempoEntrenoInfo, ultimoPesoConocido });

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Text style={styles.tituloVista}>Cambio Físico Editorial</Text>
        <Text style={styles.subtituloFecha}>Fecha: {fechaSeleccionada}</Text>
      </View>

      <FlatList
        data={registrosDelDia}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderizarTarjetaCambio}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contenidoLista}
        ListHeaderComponent={renderCabeceraLista()}
        ListEmptyComponent={
          <View style={styles.estadoVacio}>
            <Feather
              name="camera"
              size={32}
              color={TOKENS.colors.textMuted}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.textoVacio}>
              {esHoy
                ? 'Aún no tienes análisis de cambio físico registrados hoy. Adjunta entre 1 y 10 fotografías para abrir la báscula circular y obtener tu veredicto 0/10.'
                : `Sin registros fotográficos ni pesaje en esta fecha (${fechaSeleccionada}).`}
            </Text>
          </View>
        }
      />

      {renderModalBascula()}
    </View>
  );
}
