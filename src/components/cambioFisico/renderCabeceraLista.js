/**
 * Render de "renderCabeceraLista". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de CambioFisicoView.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '../base/Texto';
import { Feather } from '@expo/vector-icons';
import { MAX_FOTOS_POR_ANALISIS } from './base';
import { OBJETIVOS_PERFIL_VALIDOS, PERFIL_USUARIO_BASE } from '../../services/storage';
import SelectorSemanal from '../SelectorSemanal';
import { TOKENS } from '../../theme/tokens';
import { styles } from './estilos';

export const crearRenderCabeceraLista = (ctx) => (...args) => {
  const { abrirCamara, abrirGaleria, abrirMenuInteractivoPreAnalisis, alturaCmPerfil, alturaMetrosPerfil, analizando, avisoLimiteFotos, cambiarObjetivo, diasConFoto, edadInfo, esHoy, fechaSeleccionada, fotosSeleccionadas, limpiarFotosSeleccionadas, mensajeError, onAbrirEdicionPerfil, perfilActivo, quitarFotoSeleccionada, registrosDelDia, setFechaSeleccionada, sexoPerfil, textoProgreso, tiempoEntrenoInfo, ultimoPesoConocido } = ctx;
  const renderCabeceraLista = () => (
            <View>
              {/* Selector Semanal Superior (Spec 007) */}
              <SelectorSemanal
                fechaSeleccionada={fechaSeleccionada}
                onSeleccionarFecha={setFechaSeleccionada}
                diasConActividad={diasConFoto}
              />
  
              {/* Banner de Modo Solo Lectura si no es hoy */}
              {!esHoy ? (
                <View style={styles.bannerModoHistorial}>
                  <Feather
                    name="calendar"
                    size={13}
                    color={TOKENS.colors.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.textoModoHistorial}>
                    Historial de cambio físico ({fechaSeleccionada}) · Modo solo lectura. Días pasados no pueden modificarse.
                  </Text>
                </View>
              ) : null}
  
              <View style={styles.tarjetaPerfil}>
                <View style={styles.cabeceraTarjetaPerfil}>
                  <View style={styles.tituloPasaporteFila}>
                    <Feather
                      name="user"
                      size={12}
                      color={TOKENS.colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.etiquetaPasaporteBio}>
                      {perfilActivo?.nombre
                        ? `PASAPORTE BIOMÉTRICO · ${String(perfilActivo.nombre).toUpperCase()}`
                        : 'PASAPORTE BIOMÉTRICO'}
                    </Text>
                  </View>
  
                  {typeof onAbrirEdicionPerfil === 'function' ? (
                    <TouchableOpacity
                      accessibilityRole="button" accessibilityLabel="Editar perfil biométrico"
                      style={styles.botonEditarPerfilBio}
                      activeOpacity={0.8}
                      onPress={onAbrirEdicionPerfil}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather
                        name="sliders"
                        size={11}
                        color={TOKENS.colors.textPrimary}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.textoBotonEditarPerfilBio}>
                        Editar Perfil
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
  
                <View style={styles.filaMetricasBio}>
                  <View style={styles.itemBio}>
                    <Text style={styles.etiquetaBio}>EDAD EXACTA</Text>
                    <Text style={styles.valorBio}>{edadInfo.texto}</Text>
                    <Text style={styles.subvalorBio}>
                      Nac: {edadInfo.fechaNacimiento}
                    </Text>
                  </View>
                  <View style={styles.itemBio}>
                    <Text style={styles.etiquetaBio}>ENTRENANDO</Text>
                    <Text style={styles.valorBio} numberOfLines={1}>
                      {tiempoEntrenoInfo.texto}
                    </Text>
                    <Text style={styles.subvalorBio}>
                      Desde {tiempoEntrenoInfo.fechaInicio}
                    </Text>
                  </View>
                  <View style={styles.itemBio}>
                    <Text style={styles.etiquetaBio}>PERFIL FÍSICO</Text>
                    <Text style={styles.valorBio}>
                      {alturaCmPerfil} cm · {ultimoPesoConocido.toFixed(1)} kg
                    </Text>
                    <Text style={styles.subvalorBio}>
                      {sexoPerfil} ({alturaMetrosPerfil.toFixed(2)} m)
                    </Text>
                  </View>
                </View>
  
                <View style={styles.bloqueObjetivo}>
                  <Text style={styles.etiquetaObjetivo}>
                    OBJETIVO ACTUAL:
                  </Text>
                  <View style={styles.filaObjetivos}>
                    {OBJETIVOS_PERFIL_VALIDOS.map((obj) => {
                      const activo =
                        (perfilActivo?.objetivo ||
                          PERFIL_USUARIO_BASE.objetivo) === obj;
                      return (
                        <TouchableOpacity
                          accessibilityRole="radio" accessibilityLabel={`Objetivo ${obj}`} aria-selected={activo}
                          key={obj}
                          style={[
                            styles.chipObjetivo,
                            activo
                              ? styles.chipObjetivoActivo
                              : styles.chipObjetivoInactivo,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => cambiarObjetivo(obj)}
                        >
                          <Text
                            style={[
                              styles.textoChipObjetivo,
                              activo
                                ? styles.textoChipObjetivoActivo
                                : styles.textoChipObjetivoInactivo,
                            ]}
                          >
                            {obj}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
  
              {esHoy ? (
              <View style={styles.tarjetaCaptura}>
                <View style={styles.filaTituloCaptura}>
                  <Text style={styles.tituloSeccion}>
                    Selecciona de 1 a 10 fotografías
                  </Text>
                  <View style={styles.insigniaContadorFotos}>
                    <Text style={styles.textoContadorFotos}>
                      {fotosSeleccionadas.length}/{MAX_FOTOS_POR_ANALISIS} fotos
                    </Text>
                  </View>
                </View>
  
                <View style={styles.filaBotonesCaptura}>
                  <TouchableOpacity
                    accessibilityRole="button" accessibilityLabel="Tomar foto con la cámara"
                    style={[
                      styles.botonCaptura,
                      styles.botonCamara,
                      (analizando ||
                        fotosSeleccionadas.length >= MAX_FOTOS_POR_ANALISIS) &&
                        styles.botonDeshabilitado,
                    ]}
                    activeOpacity={0.85}
                    disabled={
                      analizando ||
                      fotosSeleccionadas.length >= MAX_FOTOS_POR_ANALISIS
                    }
                    onPress={abrirCamara}
                  >
                    <Feather
                      name="camera"
                      size={16}
                      color={TOKENS.colors.textInverse}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.textoBotonCamara}>Cámara</Text>
                  </TouchableOpacity>
  
                  <TouchableOpacity
                    accessibilityRole="button" accessibilityLabel="Elegir fotos de la galería, hasta 10"
                    style={[
                      styles.botonCaptura,
                      styles.botonGaleria,
                      (analizando ||
                        fotosSeleccionadas.length >= MAX_FOTOS_POR_ANALISIS) &&
                        styles.botonDeshabilitado,
                    ]}
                    activeOpacity={0.85}
                    disabled={
                      analizando ||
                      fotosSeleccionadas.length >= MAX_FOTOS_POR_ANALISIS
                    }
                    onPress={abrirGaleria}
                  >
                    <Feather
                      name="image"
                      size={16}
                      color={TOKENS.colors.textPrimary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.textoBotonGaleria}>Galería (1–10)</Text>
                  </TouchableOpacity>
                </View>
  
                {avisoLimiteFotos ? (
                  <Text style={styles.textoAvisoLimite}>{avisoLimiteFotos}</Text>
                ) : null}
  
                {fotosSeleccionadas.length > 0 ? (
                  <View style={styles.contenedorPreviaFotos}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.scrollMiniaturas}
                    >
                      {fotosSeleccionadas.map((foto, index) => (
                        <View
                          key={foto.idTemp}
                          style={styles.contenedorMiniaturaPrevia}
                        >
                          <Image
                            source={{ uri: foto.uri }}
                            style={styles.imagenMiniaturaPrevia}
                          />
                          <View style={styles.badgeIndiceFoto}>
                            <Text style={styles.textoBadgeIndice}>
                              #{index + 1}
                            </Text>
                          </View>
                          <TouchableOpacity
                            accessibilityRole="button" accessibilityLabel="Quitar esta foto"
                            style={styles.botonQuitarFoto}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            onPress={() => quitarFotoSeleccionada(foto.idTemp)}
                          >
                            <Feather name="x" size={12} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
  
                    <View style={styles.filaAccionesPreAnalisis}>
                      <TouchableOpacity
                        accessibilityRole="button" accessibilityLabel="Continuar a báscula y hora" aria-busy={analizando || undefined}
                        style={[
                          styles.botonContinuarBascula,
                          analizando && styles.botonDeshabilitado,
                        ]}
                        activeOpacity={0.85}
                        disabled={analizando}
                        onPress={abrirMenuInteractivoPreAnalisis}
                      >
                        <Feather
                          name="sliders"
                          size={16}
                          color={TOKENS.colors.textInverse}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.textoBotonContinuarBascula}>
                          Continuar a Báscula y Hora ({fotosSeleccionadas.length})
                        </Text>
                      </TouchableOpacity>
  
                      <TouchableOpacity
                        accessibilityRole="button" accessibilityLabel="Quitar todas las fotos seleccionadas"
                        style={styles.botonLimpiarSeleccion}
                        disabled={analizando}
                        onPress={limpiarFotosSeleccionadas}
                      >
                        <Text style={styles.textoLimpiarSeleccion}>Limpiar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
  
                {analizando ? (
                  <View style={styles.contenedorCarga}>
                    <ActivityIndicator size="large" color={TOKENS.colors.accentWhite} />
                    <Text style={styles.textoCarga}>
                      Analizando cambio físico y balance del día...
                    </Text>
                    <Text style={styles.subtextoCarga}>
                      {textoProgreso ||
                        'Procesando fotografías, perfil biológico y actividad de hoy'}
                    </Text>
                  </View>
                ) : null}
  
                {mensajeError ? (
                  <Text style={styles.textoError}>{mensajeError}</Text>
                ) : null}
              </View>
              ) : null}
  
              <View style={styles.encabezadoHistorial}>
                <Text style={styles.tituloSeccion}>
                  {esHoy ? `Chequeos Físicos de Hoy (${registrosDelDia.length})` : `Chequeos del Día (${registrosDelDia.length})`}
                </Text>
                <Text style={styles.contadorLista}>
                  {registrosDelDia.length} registro(s)
                </Text>
              </View>
            </View>
    );
  return renderCabeceraLista(...args);
};
