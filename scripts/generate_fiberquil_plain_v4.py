from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

import generate_chediack_proposals as base


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
PAGE_W, PAGE_H = LETTER
ORANGE = colors.HexColor("#D95523")
DARK = colors.HexColor("#202020")
GRAY = colors.HexColor("#555555")


def styles():
    return {
        "company": ParagraphStyle(
            "company", fontName="Times-Bold", fontSize=12, leading=14,
            textColor=DARK, spaceAfter=4,
        ),
        "cover_title": ParagraphStyle(
            "cover_title", fontName="Times-Bold", fontSize=22, leading=27,
            alignment=TA_LEFT, textColor=DARK, spaceBefore=32, spaceAfter=18,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", fontName="Times-Roman", fontSize=12, leading=17,
            textColor=GRAY, spaceAfter=30,
        ),
        "meta": ParagraphStyle(
            "meta", fontName="Times-Roman", fontSize=10, leading=16,
            textColor=DARK, leftIndent=0, spaceAfter=3,
        ),
        "heading": ParagraphStyle(
            "heading", fontName="Times-Bold", fontSize=14, leading=17,
            textColor=ORANGE, spaceBefore=8, spaceAfter=12,
        ),
        "subheading": ParagraphStyle(
            "subheading", fontName="Times-Bold", fontSize=11, leading=14,
            textColor=DARK, spaceBefore=10, spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "body", fontName="Times-Roman", fontSize=10.5, leading=15,
            textColor=DARK, alignment=TA_LEFT, spaceAfter=9,
        ),
        "list": ParagraphStyle(
            "list", fontName="Times-Roman", fontSize=10.2, leading=14.5,
            textColor=DARK, leftIndent=15, firstLineIndent=-10, spaceAfter=5,
        ),
        "price": ParagraphStyle(
            "price", fontName="Times-Bold", fontSize=13, leading=18,
            textColor=DARK, spaceBefore=12, spaceAfter=8,
        ),
        "small": ParagraphStyle(
            "small", fontName="Times-Italic", fontSize=9, leading=12,
            textColor=GRAY, spaceAfter=5,
        ),
        "sign": ParagraphStyle(
            "sign", fontName="Times-Roman", fontSize=9.5, leading=13,
            textColor=DARK, alignment=TA_CENTER,
        ),
    }


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Times-Roman", 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(22 * mm, 13 * mm, "Fiberquil S.R.L. - Propuesta técnica y comercial")
    canvas.drawRightString(PAGE_W - 22 * mm, 13 * mm, f"Página {doc.page}")
    canvas.restoreState()


def section(story, s, heading):
    story.append(Paragraph(heading, s["heading"]))
    story.append(HRFlowable(width="100%", thickness=0.7, color=ORANGE, spaceAfter=12))


def para(story, s, text):
    story.append(Paragraph(text, s["body"]))


def item(story, s, text):
    story.append(Paragraph(f"- {text}", s["list"]))


def build():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    p = base.PROPOSALS[0]
    path = OUTPUT / "Propuesta_Fiberquil_Chediack_Mudanza.pdf"
    doc = SimpleDocTemplate(
        str(path),
        pagesize=LETTER,
        rightMargin=25 * mm,
        leftMargin=25 * mm,
        topMargin=23 * mm,
        bottomMargin=22 * mm,
        title="Fiberquil - Mudanza de sitios Claro y Movistar",
        author=p.name,
    )
    s = styles()
    story = []

    # 1. Portada: deliberadamente similar a un documento de oficina, sin paneles.
    story.append(Image(str(p.logo), width=54 * mm, height=15 * mm))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1, color=ORANGE))
    story.append(Paragraph("PROPUESTA TÉCNICA Y COMERCIAL", s["company"]))
    story.append(Paragraph("Mudanza integral de dos sitios de telefonía móvil", s["cover_title"]))
    story.append(Paragraph("Sitios Claro y Movistar<br/>Paso Bajo Nivel y Anillo Peatonal de Av. Pampa", s["cover_sub"]))
    story.append(Paragraph("<b>Cliente:</b> José J. Chediack S.A.I.C.A.", s["meta"]))
    story.append(Paragraph("<b>Modalidad:</b> llave en mano", s["meta"]))
    story.append(Paragraph("<b>Plazo estimado:</b> 60 días corridos", s["meta"]))
    story.append(Paragraph("<b>Fecha:</b> 5 de agosto de 2026", s["meta"]))
    story.append(Paragraph(f"<b>Referencia:</b> {p.reference}", s["meta"]))
    story.append(Spacer(1, 38 * mm))
    story.append(Paragraph(f"{p.name}<br/>{p.address}<br/>CUIT {p.cuit}<br/>{p.web}", s["small"]))
    story.append(PageBreak())

    # 2. Carta y objeto.
    section(story, s, "1. Presentación y objeto")
    para(story, s, "Señores José J. Chediack S.A.I.C.A.:")
    para(story, s, "Por medio de la presente, Fiberquil S.R.L. cotiza la ejecución integral de la mudanza de los dos sitios de telefonía móvil de Claro y Movistar actualmente instalados dentro del sector afectado por la obra.")
    para(story, s, "La contratación se plantea bajo modalidad llave en mano. Comprende la ingeniería de detalle, obra civil, desmontaje, traslado, montaje estructural, reinstalación de equipos, configuración, integración, ensayos y entrega final.")
    para(story, s, "Fiberquil tendrá a su cargo la coordinación de las tareas con el comitente y con cada operador, incluyendo la preparación de procedimientos, ventanas de trabajo, inventarios y documentación conforme a obra.")
    story.append(Paragraph("Posiciones informadas", s["subheading"]))
    item(story, s, "CLARO - posición actual: Norte 6.176.190,11 / Este 6.368.454,26.")
    item(story, s, "CLARO - posición proyectada: Norte 6.176.274,96 / Este 6.368.321,08. Traslado aproximado: 154,77 m.")
    item(story, s, "MOVISTAR - posición actual: Norte 6.176.173,26 / Este 6.368.480,60.")
    item(story, s, "MOVISTAR - posición proyectada: Norte 6.176.266,58 / Este 6.368.333,46. Traslado aproximado: 170,75 m.")
    para(story, s, "La entrega prevista consiste en los dos sitios operativos, visibles desde OSS/NOC, con alarmas verificadas, protocolos completos y aceptación de cada operador.")
    story.append(PageBreak())

    # 3. Ingeniería, obra civil y estructura.
    section(story, s, "2. Ingeniería, obra civil y estructura")
    story.append(Paragraph("2.1 Relevamiento e ingeniería", s["subheading"]))
    para(story, s, "Se efectuará el relevamiento físico y fotográfico de cada sitio, inventario de equipos, replanteo topográfico georreferenciado y estudio de suelos. Se prepararán las memorias de cálculo, planos, MOP, procedimientos de izaje y documentación requerida para la ejecución.")
    story.append(Paragraph("2.2 Fundaciones y canalizaciones", s["subheading"]))
    para(story, s, "Se incluye excavación, retiro de suelo, fundación de hormigón armado de hasta 10 m3 por sitio, armaduras, jaula de anclaje, plantilla, canalizaciones, cámaras, bases auxiliares, curado y liberación para montaje.")
    story.append(Paragraph("2.3 Desmontaje", s["subheading"]))
    para(story, s, "Antes del retiro se realizará el corte coordinado, etiquetado y registro de la instalación. Se desmontarán los gabinetes y las estructuras tipo monoposte de hasta 18 m, utilizando grúa y personal habilitado. Todos los elementos quedarán inventariados.")
    story.append(Paragraph("2.4 Traslado y montaje", s["subheading"]))
    para(story, s, "Las estructuras y equipos serán trasladados dentro del predio. El montaje incluye grúa, izaje, aplomado, nivelación, torqueado, puesta a tierra de estructura y verificación final de anclajes.")
    item(story, s, "No se considera la provisión de monopostes nuevos.")
    item(story, s, "Las fundaciones especiales o de volumen superior deberán revisarse.")
    item(story, s, "Toda interferencia no informada será tratada como adicional.")
    story.append(PageBreak())

    # 4. Sistemas activos.
    section(story, s, "3. Sistemas activos e integración")
    story.append(Paragraph("3.1 Radio y transmisión", s["subheading"]))
    para(story, s, "Se desmontarán y reinstalarán antenas, RRU, enlaces de microondas, soportes, alimentadores, jumpers y elementos de sellado. La orientación y los ajustes de azimut y tilt se realizarán según la ingeniería aprobada por cada operador.")
    story.append(Paragraph("3.2 Energía y climatización", s["subheading"]))
    para(story, s, "Comprende gabinete outdoor, BBU, rectificadores, bancos de baterías, tableros AC/DC, climatización, protecciones, PAT, protección atmosférica, puesta a tierra de línea, balizamiento y alarmas cuando correspondan.")
    story.append(Paragraph("3.3 Fibra óptica", s["subheading"]))
    para(story, s, "Incluye tendido y ordenamiento, fusiones, conectorización, armado de ODF y bandejas, limpieza de conectores, certificación OTDR bidireccional y entrega de trazas.")
    story.append(Paragraph("3.4 Integración", s["subheading"]))
    para(story, s, "Se realizará la configuración de BBU y radios, integración con OSS/NOC, verificación de alarmas, commissioning y swap. Cada ventana contará con una alternativa de rollback.")
    story.append(Paragraph("3.5 Pruebas de aceptación", s["subheading"]))
    para(story, s, "Se ejecutarán sweep test, DTF, verificación de VSWR, PIM, mediciones de potencia y alineación GPS de azimut y tilt. La puesta en servicio incluye soporte técnico durante las 72 horas posteriores.")
    story.append(PageBreak())

    # 5. Ejecución, seguridad y entrega.
    section(story, s, "4. Forma de ejecución")
    para(story, s, "El programa general previsto es de sesenta días corridos y se organizará con tareas simultáneas siempre que las condiciones de obra y las aprobaciones lo permitan.")
    item(story, s, "Días 1 a 7: relevamiento, topografía, inventario y replanteo.")
    item(story, s, "Días 8 a 19: memorias, planos, MOP, planes de izaje y coordinación de ventanas.")
    item(story, s, "Días 20 a 37: fundaciones, canalizaciones y curado.")
    item(story, s, "Días 38 a 48: desmontaje, traslado, izaje y montaje.")
    item(story, s, "Días 49 a 58: reinstalación de radio, energía, fibra e integración.")
    item(story, s, "Días 59 y 60: ensayos, logística inversa, documentación y actas.")
    story.append(Paragraph("Seguridad y ambiente", s["subheading"]))
    para(story, s, "El personal estará registrado y asegurado. Se contará con Programa de Seguridad aprobado por ART, permisos para altura, izaje y trabajos con tensión, control de exposición a radiofrecuencia, vallado, señalización y gestión de residuos.")
    story.append(Paragraph("Documentación de cierre", s["subheading"]))
    para(story, s, "Se entregarán inventarios, registro fotográfico, memorias, planos, protocolos de radio y fibra, documentación as-built, constancias de logística inversa y acta de aceptación.")
    story.append(PageBreak())

    # 6. Precio.
    section(story, s, "5. Propuesta económica")
    para(story, s, "Los valores se expresan en dólares estadounidenses y no incluyen IVA.")
    story.append(Paragraph(f"A. Infraestructura civil y estructural: {p.block_a}", s["price"]))
    para(story, s, "Incluye ingeniería, relevamiento, fundaciones, desmontaje de monopostes, traslado, izaje, montaje, logística inversa y disposición de residuos para ambos sitios.")
    story.append(Paragraph(f"B. Electrónica, integración y puesta en servicio: {p.block_b}", s["price"]))
    para(story, s, "Incluye desmontaje y reinstalación de equipos activos, sistema radiante, transmisión, energía, fibra, configuración, integración, ensayos y soporte posterior para ambos sitios.")
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="100%", thickness=1.2, color=DARK, spaceAfter=9))
    story.append(Paragraph(f"TOTAL GENERAL: {p.total}", s["price"]))
    story.append(Paragraph(f"Monto en letras: {p.words}.", s["small"]))
    story.append(Spacer(1, 10 * mm))
    para(story, s, f"Si el comitente ejecuta integralmente una fundación, se descontará {p.foundation} por cada fundación realizada.")
    story.append(PageBreak())

    # 7. Condiciones y exclusiones.
    section(story, s, "6. Condiciones comerciales")
    item(story, s, "Anticipo: 40% contra orden de compra.")
    item(story, s, "Saldo: certificaciones mensuales pagaderas a 30 días.")
    item(story, s, "Retención final: 10% contra aceptación definitiva.")
    item(story, s, "Pago en pesos: tipo vendedor BNA dólar billete del día de pago.")
    item(story, s, "Validez de la oferta: 30 días corridos.")
    item(story, s, "Inicio: anticipo acreditado, orden de compra y frentes liberados.")
    story.append(Paragraph("Exclusiones", s["subheading"]))
    item(story, s, "Estructuras portantes, hardware y licencias nuevas.")
    item(story, s, "Acometida eléctrica definitiva, medidor, tasas, derechos y sellados.")
    item(story, s, "Fundaciones profundas, entibados especiales o suelos masivos.")
    item(story, s, "Refuerzos o interferencias que no puedan detectarse durante el relevamiento.")
    item(story, s, "Vigilancia permanente fuera del predio.")
    para(story, s, "Las modificaciones de alcance, ubicación, configuración o condiciones de ejecución podrán producir una revisión del precio y del plazo.")
    story.append(Spacer(1, 22 * mm))
    story.append(HRFlowable(width="42%", thickness=0.5, color=GRAY, hAlign="LEFT"))
    story.append(Paragraph("FIBERQUIL S.R.L.", s["sign"]))
    story.append(Spacer(1, 14 * mm))
    story.append(HRFlowable(width="42%", thickness=0.5, color=GRAY, hAlign="RIGHT"))
    story.append(Paragraph("JOSÉ J. CHEDIACK S.A.I.C.A.", s["sign"]))

    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    pages = len(PdfReader(str(path)).pages)
    if pages != 7:
        raise RuntimeError(f"Fiberquil debe tener 7 páginas y generó {pages}")
    print(f"OK {path.name}: {pages} páginas, {path.stat().st_size} bytes")


if __name__ == "__main__":
    build()