from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer

import generate_chediack_proposals as base


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
PAGE_W, PAGE_H = LETTER
ORANGE = colors.HexColor("#D95523")
DARK = colors.HexColor("#222222")
GRAY = colors.HexColor("#555555")


def make_styles():
    return {
        "company": ParagraphStyle(
            "company", fontName="Times-Bold", fontSize=11, leading=13,
            textColor=DARK, spaceAfter=4,
        ),
        "cover_title": ParagraphStyle(
            "cover_title", fontName="Times-Bold", fontSize=21, leading=25,
            alignment=TA_LEFT, textColor=DARK, spaceBefore=30, spaceAfter=16,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", fontName="Times-Roman", fontSize=11, leading=16,
            textColor=GRAY, spaceAfter=28,
        ),
        "meta": ParagraphStyle(
            "meta", fontName="Times-Roman", fontSize=10, leading=16,
            textColor=DARK, spaceAfter=2,
        ),
        "heading": ParagraphStyle(
            "heading", fontName="Times-Bold", fontSize=14, leading=17,
            textColor=ORANGE, spaceBefore=8, spaceAfter=10,
        ),
        "subheading": ParagraphStyle(
            "subheading", fontName="Times-Bold", fontSize=10.5, leading=14,
            textColor=DARK, spaceBefore=9, spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body", fontName="Times-Roman", fontSize=10.2, leading=14.7,
            textColor=DARK, alignment=TA_LEFT, spaceAfter=8,
        ),
        "list": ParagraphStyle(
            "list", fontName="Times-Roman", fontSize=10, leading=14,
            textColor=DARK, leftIndent=15, firstLineIndent=-10, spaceAfter=4,
        ),
        "price": ParagraphStyle(
            "price", fontName="Times-Bold", fontSize=13, leading=18,
            textColor=DARK, spaceBefore=10, spaceAfter=7,
        ),
        "small": ParagraphStyle(
            "small", fontName="Times-Italic", fontSize=8.8, leading=12,
            textColor=GRAY, spaceAfter=5,
        ),
        "sign": ParagraphStyle(
            "sign", fontName="Times-Roman", fontSize=9.2, leading=13,
            textColor=DARK, alignment=TA_CENTER,
        ),
    }


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Times-Roman", 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(22 * mm, 13 * mm, "Fiberquil S.R.L. - Reubicación Av. Pampa")
    canvas.drawRightString(PAGE_W - 22 * mm, 13 * mm, f"Página {doc.page}")
    canvas.restoreState()


def section(story, styles, title):
    story.append(Paragraph(title, styles["heading"]))
    story.append(HRFlowable(width="100%", thickness=0.7, color=ORANGE, spaceAfter=11))


def body(story, styles, text):
    story.append(Paragraph(text, styles["body"]))


def label(story, styles, text):
    story.append(Paragraph(text, styles["subheading"]))


def item(story, styles, text):
    story.append(Paragraph(f"- {text}", styles["list"]))


def build():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    p = base.PROPOSALS[0]
    path = OUTPUT / "Propuesta_Fiberquil_Chediack_Mudanza.pdf"
    doc = SimpleDocTemplate(
        str(path),
        pagesize=LETTER,
        leftMargin=25 * mm,
        rightMargin=25 * mm,
        topMargin=23 * mm,
        bottomMargin=22 * mm,
        title="Fiberquil - Reubicación de instalaciones móviles",
        author=p.name,
    )
    s = make_styles()
    story = []

    # Portada sencilla, como documento preparado en un procesador de texto.
    story.append(Image(str(p.logo), width=54 * mm, height=15 * mm))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1, color=ORANGE))
    story.append(Paragraph("PROPUESTA DE TRABAJO", s["company"]))
    story.append(Paragraph("Reubicación de instalaciones móviles", s["cover_title"]))
    story.append(Paragraph("Sitios Claro y Movistar<br/>Paso Bajo Nivel y Anillo Peatonal de Av. Pampa", s["cover_sub"]))
    story.append(Paragraph("<b>Preparado para:</b> José J. Chediack S.A.I.C.A.", s["meta"]))
    story.append(Paragraph("<b>Fecha:</b> 5 de agosto de 2026", s["meta"]))
    story.append(Paragraph("<b>Tiempo previsto:</b> 60 días", s["meta"]))
    story.append(Paragraph(f"<b>Referencia:</b> {p.reference}", s["meta"]))
    story.append(Spacer(1, 42 * mm))
    story.append(Paragraph(f"{p.name}<br/>{p.address}<br/>CUIT {p.cuit}<br/>{p.web}", s["small"]))
    story.append(PageBreak())

    # 2
    section(story, s, "1. Objeto y alcance")
    body(story, s, "Fiberquil propone encargarse del movimiento de las dos instalaciones móviles que hoy interfieren con la obra de Av. Pampa. Una corresponde a Claro y la otra a Movistar.")
    body(story, s, "El planteo consiste en recuperar los postes y los equipos existentes, llevarlos a las nuevas posiciones del mismo predio y volver a conectarlos. No se trata de construir dos sitios nuevos.")
    body(story, s, "Fiberquil aportará personal, herramientas, transporte, grúas, documentación y coordinación. El trabajo termina con los equipos visibles desde los sistemas de gestión, las alarmas revisadas y la documentación de cierre entregada.")
    label(story, s, "Posiciones informadas")
    item(story, s, "Claro: desde N 6.176.190,11 / E 6.368.454,26 hasta N 6.176.274,96 / E 6.368.321,08. Distancia aproximada: 154,77 m.")
    item(story, s, "Movistar: desde N 6.176.173,26 / E 6.368.480,60 hasta N 6.176.266,58 / E 6.368.333,46. Distancia aproximada: 170,75 m.")
    label(story, s, "Resultado esperado")
    body(story, s, "Los dos emplazamientos deberán quedar funcionando, integrados en OSS/NOC, sin alarmas pendientes y aceptados por los operadores. La entrega incluirá fotografías, inventarios, pruebas y planos as-built.")
    label(story, s, "Un solo responsable")
    body(story, s, "El cliente no tendrá que administrar proveedores separados para hormigón, grúa, estructura, radio, energía o fibra. La coordinación de esas tareas queda dentro de esta propuesta.")
    story.append(PageBreak())

    # 3
    section(story, s, "2. Ingeniería y obra civil")
    label(story, s, "Revisión del lugar")
    body(story, s, "Antes de desconectar se recorrerán los dos puntos y se registrarán estructuras, gabinetes, cables, antenas y accesorios. Ese inventario se utilizará para controlar lo que baja y lo que vuelve a instalarse.")
    label(story, s, "Topografía y suelo")
    body(story, s, "Se hará un trabajo de topografía con coordenadas, cotas y referencias. También se reunirán los datos necesarios para el estudio de suelos. A partir de esa información se prepararán cálculos, croquis, planos y secuencias de maniobra.")
    label(story, s, "Documentación previa")
    body(story, s, "Los procedimientos de corte, descenso, transporte e izaje se compartirán con el cliente y con cada operador. Se prepararán MOP, pedidos de ventana y alternativas para volver al estado anterior si fuera necesario.")
    label(story, s, "Construcción de las bases")
    body(story, s, "Cada destino tendrá una fundación de hormigón armado de hasta 10 m3. Se incluyen excavación, retiro del suelo sobrante, acero, jaula de anclaje, plantilla, hormigonado, curado, canalizaciones, cámaras y apoyos menores.")
    body(story, s, "Antes del montaje se comprobarán nivel, ubicación de pernos y resistencia. Los entibados, fundaciones profundas o volúmenes mayores no están incluidos y deberán revisarse si aparecen.")
    label(story, s, "Condición para iniciar el movimiento")
    body(story, s, "No se bajará ningún equipo sin inventario y ventana confirmada. Tampoco se levantará el poste en la nueva posición hasta que la base esté liberada.")
    story.append(PageBreak())

    # 4
    section(story, s, "3. Desmontaje, traslado y montaje")
    label(story, s, "Estructuras")
    body(story, s, "Primero se marcarán cables y elementos sensibles. Luego se retirarán gabinetes y se desmontarán los postes recuperables, que no superan los 18 metros. El traslado dentro del predio se hará con protección e inventario.")
    body(story, s, "La elevación tendrá un plan propio. Se usarán grúa, aparejos certificados y personal habilitado. Una vez presentado el poste se controlarán verticalidad, nivel, orientación, apriete de anclajes y conexión equipotencial.")
    label(story, s, "Radio y transmisión")
    body(story, s, "Se reinstalarán antenas, unidades RRU, soportes y enlaces de microondas. Los alimentadores y jumpers se ordenarán nuevamente, se renovarán los sellos y se ajustarán azimut y tilt.")
    label(story, s, "Energía")
    body(story, s, "Se volverán a conectar BBU, rectificadores, bancos de baterías, tableros AC/DC, climatización, PAT, protección atmosférica, puesta a tierra de línea, balizamiento y contactos de alarma.")
    label(story, s, "Fibra")
    body(story, s, "Las fibras se tenderán y ordenarán otra vez. Se harán las fusiones necesarias, la conectorización, el armado del ODF y las bandejas. La revisión se completará con OTDR en ambos sentidos.")
    label(story, s, "Ingreso a red")
    body(story, s, "Con los equipos encendidos se cargará la configuración de radios y BBU. Se comprobará la comunicación con OSS/NOC y se ejecutará el swap. La secuencia tendrá un rollback definido.")
    story.append(PageBreak())

    # 5
    section(story, s, "4. Pruebas, seguridad y plazo")
    label(story, s, "Comprobaciones")
    body(story, s, "Las líneas se revisarán con sweep y DTF, incluyendo VSWR. También se medirán PIM y potencia. La alineación GPS dejará registrados azimut y tilt. Las alarmas deberán responder tanto en forma local como remota.")
    label(story, s, "Acompañamiento")
    body(story, s, "Después de habilitar cada sitio se mantendrá una guardia técnica durante tres jornadas. Ese período corresponde a 72 horas de soporte para incidentes relacionados con el traslado.")
    label(story, s, "Seguridad y orden")
    body(story, s, "El programa preventivo se presentará a la ART. El personal tendrá cobertura y permisos para altura, izaje y maniobras eléctricas. La exposición a radiofrecuencia se manejará con bloqueo y coordinación.")
    body(story, s, "Los sectores permanecerán vallados y señalizados. Los residuos, embalajes y sobrantes se retirarán. La logística inversa hacia depósitos de TMA o Claro se documentará.")
    label(story, s, "Secuencia estimada")
    item(story, s, "Semana 1: visita, inventario, topografía y replanteo.")
    item(story, s, "Semanas 2 y 3: documentación, cálculos, MOP y ventanas.")
    item(story, s, "Semanas 4 y 5: bases, canalizaciones y curado.")
    item(story, s, "Semanas 6 y 7: desarme, traslado y montaje.")
    item(story, s, "Semana 8: reconexión, pruebas, carpeta final y aceptación.")
    body(story, s, "La carpeta final reunirá fotografías, inventarios, resultados de radio, trazas OTDR, memorias, planos as-built y constancias de devolución de materiales.")
    story.append(PageBreak())

    # 6
    section(story, s, "5. Propuesta económica")
    body(story, s, "Los importes siguientes consideran los dos emplazamientos y están expresados en dólares estadounidenses. El IVA no está incluido.")
    story.append(Paragraph(f"Parte civil y movimiento de estructuras: {p.block_a}", s["price"]))
    body(story, s, "Incluye visita, mediciones, proyecto de bases, hormigón, desarme de postes, transporte interno, grúa, montaje y retiro de sobrantes.")
    story.append(Paragraph(f"Reconexión técnica y regreso a servicio: {p.block_b}", s["price"]))
    body(story, s, "Incluye equipos activos, radio, microondas, gabinetes, alimentación, baterías, climatización, fibra, configuración, ensayos y asistencia posterior.")
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="100%", thickness=1.1, color=DARK, spaceAfter=8))
    story.append(Paragraph(f"Importe completo: {p.total}", s["price"]))
    story.append(Paragraph(f"En palabras: {p.words}.", s["small"]))
    story.append(Spacer(1, 8 * mm))
    body(story, s, f"Si el cliente construye una base con su propia organización, se descontarán {p.foundation} por esa fundación, siempre que se entregue terminada y verificada.")
    story.append(PageBreak())

    # 7
    section(story, s, "6. Condiciones comerciales y exclusiones")
    label(story, s, "Pagos")
    body(story, s, "Para movilizar recursos se solicita un anticipo del 40% una vez emitida la orden de compra. El resto se certificará mensualmente y será pagadero a treinta días. El último 10% queda sujeto a la aceptación definitiva.")
    body(story, s, "Los pagos en pesos tomarán el tipo vendedor del dólar billete publicado por Banco Nación para la fecha de pago.")
    label(story, s, "Vigencia y comienzo")
    body(story, s, "La oferta puede aceptarse durante treinta días. El plazo de sesenta días empieza con el anticipo acreditado, la orden emitida y los frentes disponibles. Las demoras por aprobaciones o ventanas externas desplazan el calendario.")
    label(story, s, "No incluido")
    item(story, s, "Equipos, estructuras o herrajes nuevos.")
    item(story, s, "Licencias o ampliaciones de capacidad.")
    item(story, s, "Acometida eléctrica definitiva, medidor, tasas, derechos y sellados.")
    item(story, s, "Fundaciones profundas, entibados o condiciones de suelo no informadas.")
    item(story, s, "Vigilancia permanente e interferencias de terceros no documentadas.")
    body(story, s, "Todo cambio de ubicación, configuración o volumen de trabajo se conversará y valorizará antes de ejecutarse.")
    story.append(Spacer(1, 16 * mm))
    story.append(HRFlowable(width=57 * mm, thickness=0.5, color=GRAY, hAlign="LEFT"))
    story.append(Paragraph("FIBERQUIL S.R.L.", s["sign"]))
    story.append(Spacer(1, 12 * mm))
    story.append(HRFlowable(width=57 * mm, thickness=0.5, color=GRAY, hAlign="RIGHT"))
    story.append(Paragraph("JOSÉ J. CHEDIACK S.A.I.C.A.", s["sign"]))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    pages = len(PdfReader(str(path)).pages)
    if pages != 7:
        raise RuntimeError(f"Fiberquil debe tener 7 páginas y generó {pages}")
    print(f"OK {path.name}: {pages} páginas, {path.stat().st_size} bytes")


if __name__ == "__main__":
    build()