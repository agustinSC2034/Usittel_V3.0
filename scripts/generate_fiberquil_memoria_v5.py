from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer

import generate_chediack_proposals as base


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
PAGE_W, PAGE_H = LETTER
ORANGE = colors.HexColor("#D55224")
CHARCOAL = colors.HexColor("#26231F")
SOFT = colors.HexColor("#6A625A")

pdfmetrics.registerFont(TTFont("Georgia", r"C:/Windows/Fonts/georgia.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Bold", r"C:/Windows/Fonts/georgiab.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Italic", r"C:/Windows/Fonts/georgiai.ttf"))


def make_styles():
    return {
        "kicker": ParagraphStyle(
            "kicker", fontName="Georgia-Bold", fontSize=8.5, leading=11,
            textColor=ORANGE, uppercase=True, spaceAfter=8,
        ),
        "cover": ParagraphStyle(
            "cover", fontName="Georgia-Bold", fontSize=24, leading=30,
            textColor=CHARCOAL, alignment=TA_LEFT, spaceAfter=18,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", fontName="Georgia", fontSize=11.5, leading=17,
            textColor=SOFT, alignment=TA_LEFT, spaceAfter=7,
        ),
        "chapter": ParagraphStyle(
            "chapter", fontName="Georgia-Bold", fontSize=18, leading=22,
            textColor=CHARCOAL, spaceAfter=7,
        ),
        "deck": ParagraphStyle(
            "deck", fontName="Georgia-Italic", fontSize=10.5, leading=15,
            textColor=ORANGE, spaceAfter=20,
        ),
        "lead": ParagraphStyle(
            "lead", fontName="Georgia", fontSize=11.2, leading=17,
            textColor=CHARCOAL, spaceAfter=13,
        ),
        "body": ParagraphStyle(
            "body", fontName="Georgia", fontSize=9.8, leading=15,
            textColor=CHARCOAL, spaceAfter=10,
        ),
        "label": ParagraphStyle(
            "label", fontName="Georgia-Bold", fontSize=10.2, leading=14,
            textColor=CHARCOAL, spaceBefore=10, spaceAfter=5,
        ),
        "note": ParagraphStyle(
            "note", fontName="Georgia-Italic", fontSize=8.8, leading=13,
            textColor=SOFT, spaceAfter=8,
        ),
        "money": ParagraphStyle(
            "money", fontName="Georgia-Bold", fontSize=16, leading=21,
            textColor=CHARCOAL, spaceBefore=9, spaceAfter=7,
        ),
        "signature": ParagraphStyle(
            "signature", fontName="Georgia", fontSize=8.8, leading=12,
            textColor=CHARCOAL, alignment=TA_CENTER,
        ),
    }


def page_mark(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(SOFT)
    canvas.setFont("Georgia", 7.5)
    canvas.drawString(24 * mm, 13 * mm, "FIBERQUIL / REUBICACIÓN DE INSTALACIONES")
    canvas.drawRightString(PAGE_W - 24 * mm, 13 * mm, str(doc.page))
    canvas.restoreState()


def chapter(story, s, name, deck):
    story.append(Paragraph("MEMORIA DE INTERVENCIÓN", s["kicker"]))
    story.append(Paragraph(name, s["chapter"]))
    story.append(Paragraph(deck, s["deck"]))


def body(story, s, text):
    story.append(Paragraph(text, s["body"]))


def label(story, s, text):
    story.append(Paragraph(text, s["label"]))


def build():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    p = base.PROPOSALS[0]
    output = OUTPUT / "Propuesta_Fiberquil_Chediack_Mudanza.pdf"

    doc = SimpleDocTemplate(
        str(output),
        pagesize=LETTER,
        leftMargin=29 * mm,
        rightMargin=24 * mm,
        topMargin=25 * mm,
        bottomMargin=22 * mm,
        title="Fiberquil - Memoria de intervención",
        author=p.name,
    )
    s = make_styles()
    story = []

    # Portada
    story.append(Image(str(p.logo), width=51 * mm, height=14 * mm))
    story.append(Spacer(1, 7 * mm))
    story.append(HRFlowable(width=43 * mm, thickness=1.4, color=ORANGE, hAlign="LEFT"))
    story.append(Spacer(1, 32 * mm))
    story.append(Paragraph("MEMORIA DE INTERVENCIÓN", s["kicker"]))
    story.append(Paragraph("Reubicación de instalaciones móviles", s["cover"]))
    story.append(Paragraph("Claro y Movistar / Av. Pampa", s["cover_sub"]))
    story.append(Paragraph("Documento de trabajo preparado para José J. Chediack S.A.I.C.A.", s["cover_sub"]))
    story.append(Spacer(1, 31 * mm))
    story.append(Paragraph("Emisión: 5 de agosto de 2026", s["note"]))
    story.append(Paragraph("Horizonte de ejecución: 60 días", s["note"]))
    story.append(Paragraph(f"Identificación interna: {p.reference}", s["note"]))
    story.append(Spacer(1, 20 * mm))
    story.append(Paragraph(f"{p.name}<br/>{p.address}<br/>CUIT {p.cuit}<br/>{p.web}", s["note"]))
    story.append(PageBreak())

    # 2
    chapter(story, s, "Punto de partida", "Qué debe cambiar de lugar y qué resultado espera recibir el cliente.")
    story.append(Paragraph("Fiberquil propone tomar a su cargo el movimiento completo de las dos instalaciones móviles que hoy interfieren con la obra de Av. Pampa. Una pertenece a Claro y la otra a Movistar.", s["lead"]))
    body(story, s, "No se plantea una instalación nueva. La idea es recuperar lo que ya existe, trasladarlo dentro del predio y volver a conectarlo en las posiciones indicadas. Esto incluye los postes, los equipos de radio, la alimentación eléctrica, la transmisión y la fibra.")
    body(story, s, "La responsabilidad de Fiberquil termina cuando ambos operadores pueden ver sus equipos desde los sistemas de gestión, las alarmas quedan revisadas y se entrega la carpeta de cierre.")
    label(story, s, "Ubicaciones recibidas")
    body(story, s, "<b>Claro.</b> Sale de N 6.176.190,11 / E 6.368.454,26 y pasa a N 6.176.274,96 / E 6.368.321,08. El recorrido estimado es 154,77 m.")
    body(story, s, "<b>Movistar.</b> Sale de N 6.176.173,26 / E 6.368.480,60 y pasa a N 6.176.266,58 / E 6.368.333,46. El recorrido estimado es 170,75 m.")
    label(story, s, "Forma de contratación")
    body(story, s, "Se cotiza un único encargo para resolver los dos traslados, incluyendo personal, herramientas, transporte, grúas, documentación y coordinación. El cliente recibe las instalaciones funcionando, sin administrar contratistas por especialidad.")
    story.append(PageBreak())

    # 3
    chapter(story, s, "Antes de mover nada", "Revisión del lugar, registro de lo existente y preparación de la nueva base.")
    label(story, s, "Visita e inventario")
    body(story, s, "El primer paso será recorrer cada emplazamiento y dejar registro de estructuras, gabinetes, cableados, antenas y elementos auxiliares. El inventario se contrastará al bajar los equipos y nuevamente al instalarlos.")
    label(story, s, "Mediciones y documentación")
    body(story, s, "Se hará un trabajo de topografía con coordenadas, cotas y referencias del predio. También se tomarán los datos del terreno para el estudio geotécnico. Con esa información se prepararán cálculos, croquis, planos, secuencias de maniobra, MOP y pedidos de ventana.")
    label(story, s, "Preparación del nuevo punto")
    body(story, s, "Cada destino contará con una base de hormigón armado de hasta 10 m3. El trabajo considera excavación, retiro del material sobrante, acero, jaula de anclaje, plantilla, hormigonado, curado, cañerías, cámaras y apoyos menores.")
    body(story, s, "Antes de autorizar la grúa se comprobarán nivel, posición de pernos y resistencia alcanzada. Si aparecen suelos que exijan entibado, profundidad extraordinaria o un volumen mayor, se revisará esa parte antes de continuar.")
    label(story, s, "Papeles previos")
    body(story, s, "Los procedimientos de corte, descenso, transporte e izaje se compartirán con el cliente y con los responsables de red. Ninguna desconexión se realizará sin ventana confirmada.")
    story.append(PageBreak())

    # 4
    chapter(story, s, "Movimiento de estructuras", "Cómo se bajan, trasladan y vuelven a levantar los elementos recuperados.")
    label(story, s, "Desarme controlado")
    body(story, s, "Antes de intervenir se marcarán cables y equipos. Los elementos sensibles se bajarán primero, quedarán embalados y se anotará su condición. Luego se liberará el gabinete y se desmontará el poste. Las estructuras previstas no superan los 18 metros.")
    label(story, s, "Traslado dentro del predio")
    body(story, s, "La carga se moverá con protección para evitar golpes, humedad o pérdida de piezas. Los sobrantes y materiales que deban regresar a depósitos de TMA o Claro seguirán el circuito de logística inversa indicado por cada operador.")
    label(story, s, "Nueva posición")
    body(story, s, "La maniobra de elevación tendrá un plan propio. Se dispondrá de grúa, aparejos certificados y personal habilitado. Una vez presentado el poste se controlarán verticalidad, nivel, orientación y apriete de anclajes.")
    label(story, s, "Vínculo eléctrico de la estructura")
    body(story, s, "Después del montaje se recompondrá la conexión equipotencial y se medirá la puesta a tierra. También se revisarán la protección contra descargas atmosféricas y los vínculos de tierra de los cables que suben por la estructura.")
    body(story, s, "No está contemplada la compra de postes ni de herrajes nuevos. Si durante el desarme se detecta una pieza que no puede volver a utilizarse, se informará antes de reemplazarla.")
    story.append(PageBreak())

    # 5
    chapter(story, s, "Reconexión de los sistemas", "Radio, transmisión, energía y fibra vuelven a quedar en servicio.")
    label(story, s, "Equipos de radio")
    body(story, s, "Se reinstalarán las unidades remotas, antenas, soportes y enlaces de microondas. Después se ordenarán alimentadores y jumpers, se renovarán sellos y se ajustarán orientación, azimut y tilt de acuerdo con la información del operador.")
    label(story, s, "Gabinetes y alimentación")
    body(story, s, "Se volverán a ubicar BBU, rectificadores y bancos de baterías. También se conectarán tableros de alterna y continua, climatización, protecciones, PAT, balizamiento y contactos de alarma. La puesta a tierra de línea se comprobará antes de energizar.")
    label(story, s, "Fibra y transmisión")
    body(story, s, "Las fibras serán tendidas y ordenadas nuevamente. Se rehacen las fusiones necesarias, la conectorización, el ODF y las bandejas. La comprobación final se hará con OTDR en ambos sentidos y las trazas quedarán dentro de la entrega.")
    label(story, s, "Ingreso a red")
    body(story, s, "Con la instalación encendida se cargará la configuración de radios y BBU. El sitio deberá aparecer correctamente en OSS/NOC. La ventana de cambio tendrá pasos de vuelta atrás definidos por si la validación no resulta satisfactoria.")
    story.append(PageBreak())

    # 6
    chapter(story, s, "Pruebas, acompañamiento y cierre", "Qué se controla antes de considerar terminado cada traslado.")
    label(story, s, "Chequeos de radiofrecuencia")
    body(story, s, "Las líneas se revisarán con sweep y DTF, incluyendo VSWR. También se harán mediciones de PIM y potencia. La alineación GPS se usará para dejar registrados azimut y tilt.")
    label(story, s, "Chequeos operativos")
    body(story, s, "Se observarán alarmas, comunicación con los sistemas centrales y comportamiento de los servicios. Cuando corresponda se ejecutará el swap. La alternativa de rollback permanecerá disponible hasta cerrar la ventana.")
    label(story, s, "Acompañamiento")
    body(story, s, "Durante las tres jornadas siguientes a la habilitación habrá una guardia técnica para atender eventos vinculados con el traslado. Este período equivale a 72 horas de soporte.")
    label(story, s, "Seguridad y orden de obra")
    body(story, s, "El programa preventivo será presentado a la ART para su aprobación. El equipo contará con cobertura, permisos para altura, izaje y maniobras eléctricas. La exposición a radiofrecuencia se administrará mediante bloqueo y coordinación con los operadores.")
    body(story, s, "El área de trabajo permanecerá señalizada y vallada. Se retirarán residuos y embalajes, y se mantendrá registro de su disposición.")
    label(story, s, "Carpeta final")
    body(story, s, "El cierre reúne fotografías, inventarios, resultados de ensayos, trazas OTDR, memorias, planos as-built y constancias de devolución de materiales. La firma del acta completa la entrega.")
    story.append(PageBreak())

    # 7
    chapter(story, s, "Cuenta económica", "Dos partes de trabajo, un solo total para los dos emplazamientos.")
    story.append(Paragraph(f"Parte civil y movimiento de estructuras: {p.block_a}", s["money"]))
    body(story, s, "Aquí se agrupan la visita inicial, las mediciones, el proyecto de fundaciones, la obra de hormigón, el desarme de postes, el transporte interno, la grúa, el montaje y el retiro de sobrantes.")
    story.append(Paragraph(f"Reconexión técnica y regreso a servicio: {p.block_b}", s["money"]))
    body(story, s, "Esta parte reúne el tratamiento de equipos activos, radio, microondas, gabinetes, alimentación, baterías, climatización, fibra, ensayos, configuración y asistencia posterior.")
    story.append(Spacer(1, 9 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=CHARCOAL))
    story.append(Paragraph(f"Importe completo: {p.total}", s["money"]))
    story.append(Paragraph(f"En palabras: {p.words}.", s["note"]))
    body(story, s, "Los importes están expresados en dólares estadounidenses y no incluyen IVA.")
    body(story, s, f"Si el cliente decide construir una de las bases con su propia organización, se resta {p.foundation} por esa fundación, siempre que se entregue terminada y verificada.")
    story.append(PageBreak())

    # 8
    chapter(story, s, "Acuerdos para trabajar", "Pagos, vigencia, límites y aceptación de esta memoria.")
    label(story, s, "Inicio y pagos")
    body(story, s, "La orden de compra habilita el encargo. Para movilizar recursos se solicita un anticipo del 40%. El avance restante se certificará mensualmente y se abonará a treinta días. El último 10% queda asociado a la aceptación definitiva.")
    body(story, s, "Si el pago se realiza en pesos, se tomará la cotización vendedora del dólar billete publicada por Banco Nación para la fecha de pago.")
    label(story, s, "Tiempos")
    body(story, s, "La oferta puede aceptarse durante treinta días desde su emisión. El programa de sesenta días comienza cuando están acreditado el anticipo, emitida la orden y disponibles los frentes. Las esperas originadas por aprobaciones o ventanas externas desplazan el calendario.")
    label(story, s, "Fuera de esta cuenta")
    body(story, s, "No se incluyeron equipos o estructuras nuevas, licencias, ampliaciones de capacidad, acometida eléctrica definitiva, medidor, tasas, derechos, sellados, vigilancia permanente ni trabajos especiales que surjan por interferencias no informadas.")
    body(story, s, "Cualquier cambio de ubicación, configuración o volumen de trabajo será conversado y valorizado antes de ejecutarse.")
    story.append(Spacer(1, 18 * mm))
    story.append(HRFlowable(width=55 * mm, thickness=0.5, color=SOFT, hAlign="LEFT"))
    story.append(Paragraph("FIBERQUIL S.R.L.", s["signature"]))
    story.append(Spacer(1, 14 * mm))
    story.append(HRFlowable(width=55 * mm, thickness=0.5, color=SOFT, hAlign="RIGHT"))
    story.append(Paragraph("JOSÉ J. CHEDIACK S.A.I.C.A.", s["signature"]))

    doc.build(story, onFirstPage=page_mark, onLaterPages=page_mark)
    pages = len(PdfReader(str(output)).pages)
    if pages != 8:
        raise RuntimeError(f"Fiberquil debe tener 8 páginas y generó {pages}")
    print(f"OK {output.name}: {pages} páginas, {output.stat().st_size} bytes")


if __name__ == "__main__":
    build()