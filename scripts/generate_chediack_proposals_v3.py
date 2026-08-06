from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

import generate_chediack_proposals_v2 as legacy


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf"
W, H = A4
M = 18 * mm
ORANGE = legacy.ORANGE
ORANGE_DARK = legacy.ORANGE_DARK
ORANGE_LIGHT = legacy.ORANGE_LIGHT
NAVY = legacy.NAVY
PURPLE = legacy.PURPLE
PURPLE_LIGHT = legacy.PURPLE_LIGHT
INK = legacy.INK
MUTED = legacy.MUTED
LINE = legacy.LINE
t = legacy.t
bullets = legacy.bullets
logo = legacy.logo
table = legacy.table


def footer(c, p, page, total, color):
    legacy.footer(c, p, page, total, color)


def fiber_header(c, p, page, title):
    c.setFillColor(ORANGE)
    c.rect(0, H - 11 * mm, W, 11 * mm, fill=1, stroke=0)
    logo(c, p, M, H - 17 * mm, 35 * mm, 12 * mm)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 7.2)
    c.drawRightString(W - M, H - 20 * mm, title.upper())
    c.setStrokeColor(colors.HexColor("#E4B6A1"))
    c.line(M, H - 25 * mm, W - M, H - 25 * mm)
    footer(c, p, page, 9, ORANGE)
    return H - 36 * mm


def bibop_header(c, p, page, title):
    return legacy.bibop_header(c, p, page, 8, title)


def title(c, heading, subtitle, y, color):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(M, y, heading)
    y -= 16
    return t(c, subtitle, M, y, W - 2 * M, size=7.6, leading=10, color=MUTED) - 12


def fiber_cover(c, p):
    c.setFillColor(colors.white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    c.rect(0, H - 12 * mm, W, 12 * mm, fill=1, stroke=0)
    logo(c, p, M, H - 29 * mm, 59 * mm, 23 * mm)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString(W - M, H - 27 * mm, "PROPUESTA TÉCNICO-COMERCIAL")
    c.setStrokeColor(ORANGE)
    c.setLineWidth(1.1)
    c.line(M, H - 41 * mm, W - M, H - 41 * mm)
    y = H - 83 * mm
    y = t(c, "MUDANZA INTEGRAL DE DOS SITIOS DE TELEFONÍA MÓVIL", M, y, W - 2 * M, font="Helvetica-Bold", size=20, leading=25, color=NAVY) - 13
    y = t(c, "Sitios Claro y Movistar - PBN y Anillo Peatonal Av. Pampa", M, y, W - 2 * M, size=10, leading=13, color=INK) - 30
    rows = [
        ("Cliente", "José J. Chediack S.A.I.C.A."),
        ("Modalidad", "Servicio llave en mano"),
        ("Plazo", "60 días corridos"),
        ("Emisión", "5 de agosto de 2026"),
        ("Referencia", p.reference),
    ]
    table(c, p, [], rows, [38 * mm, 129 * mm], M, y, size=7.5, header=False, first_col_fill=True)
    c.setFillColor(ORANGE_LIGHT)
    c.setStrokeColor(colors.HexColor("#E4B6A1"))
    c.rect(M, 52 * mm, W - 2 * M, 31 * mm, fill=1, stroke=1)
    t(c, f"{p.name}\n{p.address}\nCUIT {p.cuit} | {p.web}", M + 10, 73 * mm, W - 2 * M - 20, font="Helvetica-Bold", size=7.2, leading=10, color=INK)
    c.showPage()


def bibop_cover(c, p):
    legacy.bibop_cover(c, p)


def overview(c, p, brand):
    fiber = brand == "fiber"
    page = 2
    y = fiber_header(c, p, page, "Objeto y datos del proyecto") if fiber else bibop_header(c, p, page, "Objeto y sitios")
    color = NAVY if fiber else PURPLE
    heading = "Objeto y datos del proyecto" if fiber else "Objeto y sitios incluidos"
    y = title(c, heading, "Descripción general de la intervención y posiciones de los sitios.", y, color)
    company = "Fiberquil" if fiber else "Bibop"
    y = t(c, f"{company} cotiza la ingeniería, desmontaje, traslado, reinstalación e integración de los sitios Claro y Movistar afectados por la obra. Se recuperarán los monopostes y el equipamiento instalado para su montaje en las nuevas posiciones.", M, y, W - 2 * M, size=8.1, leading=11.5, color=INK) - 18
    rows = [
        ("CLARO", "6.176.190,11 / 6.368.454,26", "6.176.274,96 / 6.368.321,08", "154,77 m"),
        ("MOVISTAR", "6.176.173,26 / 6.368.480,60", "6.176.266,58 / 6.368.333,46", "170,75 m"),
    ]
    y = table(c, p, ["SITIO", "UBICACIÓN ACTUAL", "NUEVA UBICACIÓN", "DISTANCIA"], rows, [25 * mm, 58 * mm, 58 * mm, 26 * mm], M, y, size=6.5) - 23
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(M, y, "Alcance general")
    y -= 18
    bullets(c, [
        "Servicio completo para dos sitios bajo modalidad llave en mano.",
        "Obra civil, estructura, sistema radiante, energía, fibra y transmisión.",
        "Coordinación de ventanas con cada operador e integración con OSS/NOC.",
        "Ensayos, dossier as-built, aceptación y soporte durante 72 horas.",
    ], M, y, W - 2 * M, size=7.7, leading=10.4)
    c.showPage()


def scope_page(c, p, brand, page, heading, subtitle, rows):
    fiber = brand == "fiber"
    y = fiber_header(c, p, page, heading) if fiber else bibop_header(c, p, page, heading)
    y = title(c, heading, subtitle, y, NAVY if fiber else PURPLE)
    y = table(c, p, ["RUBRO", "TRABAJOS INCLUIDOS", "ENTREGABLE"], rows, [39 * mm, 90 * mm, 38 * mm], M, y, size=6.7, leading=8.5) - 22
    note_fill = ORANGE_LIGHT if fiber else PURPLE_LIGHT
    note_stroke = colors.HexColor("#E4B6A1") if fiber else colors.HexColor("#D9CDED")
    c.setFillColor(note_fill)
    c.setStrokeColor(note_stroke)
    c.rect(M, y - 43, W - 2 * M, 43, fill=1, stroke=1)
    t(c, "Las tareas se coordinarán con el comitente y el operador antes de cada intervención.", M + 10, y - 15, W - 2 * M - 20, size=7.2, leading=9.5, color=INK)
    c.showPage()


def plan_page(c, p, brand, page):
    fiber = brand == "fiber"
    y = fiber_header(c, p, page, "Plan de trabajo") if fiber else bibop_header(c, p, page, "Plan de trabajo")
    y = title(c, "Plan de trabajo - 60 días", "Cronograma previsto desde el relevamiento hasta la aceptación.", y, NAVY if fiber else PURPLE)
    rows = [
        ("1", "Relevamiento, topografía e inventario", "7 días", "Día 7"),
        ("2", "Ingeniería, memorias, MOP y aprobaciones", "12 días", "Día 19"),
        ("3", "Fundaciones, canalizaciones y curado", "18 días", "Día 37"),
        ("4", "Desmontaje y traslado", "6 días", "Día 43"),
        ("5", "Izaje, montaje y aplomado", "5 días", "Día 48"),
        ("6", "Radiante, energía, fibra y transmisión", "6 días", "Día 54"),
        ("7", "Integración, swap y verificación", "4 días", "Día 58"),
        ("8", "Ensayos, documentación y aceptación", "2 días", "Día 60"),
    ]
    y = table(c, p, ["ETAPA", "ACTIVIDAD", "DURACIÓN", "ACUMULADO"], rows, [20 * mm, 94 * mm, 27 * mm, 26 * mm], M, y, size=6.8) - 23
    c.setFillColor(NAVY if fiber else PURPLE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M, y, "Condiciones de coordinación")
    y -= 18
    bullets(c, [
        "Liberación de frentes, accesos y documentación del proyecto.",
        "Aprobación de MOP, planes de izaje y ventanas de corte.",
        "Rollback previsto para cada swap y puesta en servicio.",
    ], M, y, W - 2 * M, size=7.4, leading=10)
    c.showPage()


def controls_page(c, p, brand, page):
    fiber = brand == "fiber"
    y = fiber_header(c, p, page, "Seguridad, pruebas y documentación") if fiber else bibop_header(c, p, page, "Seguridad y cierre")
    y = title(c, "Seguridad, pruebas y documentación", "Controles durante la ejecución y para la aceptación final.", y, NAVY if fiber else PURPLE)
    rows = [
        ("SEGURIDAD", "Programa ART, personal asegurado, permisos de altura e izaje, tareas con tensión y control de radiofrecuencia."),
        ("AMBIENTE", "Vallado, señalización, orden del frente, gestión y disposición de residuos."),
        ("RADIO", "Sweep test, DTF, VSWR, PIM, potencia y alineación GPS de azimut/tilt."),
        ("FIBRA", "Certificación OTDR bidireccional, trazas y protocolos."),
        ("INTEGRACIÓN", "OSS/NOC, alarmas, swap, rollback y soporte durante 72 horas."),
        ("ENTREGA", "Inventarios, fotografías, planos, dossier as-built y acta de aceptación."),
    ]
    table(c, p, ["RUBRO", "REQUISITOS"], rows, [39 * mm, 128 * mm], M, y, size=7, leading=9)
    c.showPage()


def price_page(c, p, brand, page):
    fiber = brand == "fiber"
    y = fiber_header(c, p, page, "Oferta económica") if fiber else bibop_header(c, p, page, "Presupuesto")
    y = title(c, "Oferta económica" if fiber else "Presupuesto", "Valores expresados en dólares estadounidenses. IVA no incluido.", y, NAVY if fiber else PURPLE)
    rows = [
        ("A", "Infraestructura civil y estructural", "2 sitios", p.block_a),
        ("B", "Equipamiento activo, integración y puesta en servicio", "2 sitios", p.block_b),
    ]
    y = table(c, p, ["BLOQUE", "DESCRIPCIÓN", "CANTIDAD", "TOTAL"], rows, [20 * mm, 92 * mm, 24 * mm, 31 * mm], M, y, size=7.1) - 18
    color = NAVY if fiber else PURPLE
    c.setFillColor(color)
    c.rect(M, y - 51, W - 2 * M, 51, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M + 12, y - 19, "TOTAL LLAVE EN MANO")
    c.setFont("Helvetica-Bold", 20)
    c.drawRightString(W - M - 12, y - 22, p.total)
    y -= 71
    rows2 = [
        ("Fundaciones", f"Descuento de {p.foundation} por cada fundación ejecutada integralmente por el comitente."),
        ("Impuestos", "IVA y demás impuestos no incluidos."),
        ("Monto en letras", p.words),
    ]
    table(c, p, [], rows2, [38 * mm, 129 * mm], M, y, size=6.9, header=False, first_col_fill=True)
    c.showPage()


def terms_page(c, p, brand, page, include_exclusions):
    fiber = brand == "fiber"
    heading = "Condiciones comerciales" if fiber else "Condiciones y exclusiones"
    y = fiber_header(c, p, page, heading) if fiber else bibop_header(c, p, page, heading)
    y = title(c, heading, "Forma de pago, vigencia y condiciones de inicio.", y, NAVY if fiber else PURPLE)
    rows = [
        ("Anticipo", "40% contra orden de compra."),
        ("Saldo", "Certificaciones mensuales a 30 días y 10% final contra aceptación."),
        ("Pago en ARS", "Tipo vendedor BNA dólar billete del día de pago."),
        ("Validez", "30 días corridos desde la emisión."),
        ("Plazo", "60 días desde el anticipo y la liberación de frentes."),
    ]
    y = table(c, p, [], rows, [38 * mm, 129 * mm], M, y, size=7, header=False, first_col_fill=True) - 20
    if include_exclusions:
        c.setFillColor(PURPLE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(M, y, "No incluido")
        y -= 18
        y = bullets(c, [
            "Estructuras o hardware nuevos.",
            "Licencias y ampliaciones de red.",
            "Acometida eléctrica definitiva y medidor.",
            "Tasas, derechos, aranceles y sellados.",
            "Fundaciones profundas o entibados especiales.",
            "Interferencias no documentadas y vigilancia permanente.",
        ], M, y, W - 2 * M, size=7.3, leading=9.8) - 23
        c.setStrokeColor(LINE)
        c.line(M, y, M + 70 * mm, y)
        c.line(W - M - 70 * mm, y, W - M, y)
        t(c, p.name, M, y - 14, 70 * mm, font="Helvetica-Bold", size=7, leading=9, align="center")
        t(c, "José J. Chediack S.A.I.C.A.", W - M - 70 * mm, y - 14, 70 * mm, font="Helvetica-Bold", size=7, leading=9, align="center")
    else:
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(M, y, "Consideraciones")
        y -= 18
        bullets(c, [
            "La propuesta se basa en la documentación y condiciones informadas.",
            "Los cambios de alcance, ubicación o configuración podrán modificar precio y plazo.",
            "Las demoras de terceros no se computan dentro del plazo.",
        ], M, y, W - 2 * M, size=7.5, leading=10)
    c.showPage()


def fiber_exclusions(c, p):
    y = fiber_header(c, p, 9, "Exclusiones y conformidad")
    y = title(c, "Exclusiones y conformidad", "Conceptos no contemplados y espacio de aceptación.", y, NAVY)
    y = bullets(c, [
        "Estructuras portantes y hardware nuevos.",
        "Licencias o ampliaciones no vinculadas con la mudanza.",
        "Refuerzos no detectables durante el relevamiento.",
        "Acometida eléctrica definitiva, medidor y consumos.",
        "Tasas, derechos, aranceles y sellados.",
        "Fundaciones profundas, entibados o suelos masivos.",
        "Interferencias de terceros no documentadas.",
        "Vigilancia permanente fuera del predio.",
    ], M, y, W - 2 * M, size=7.6, leading=10.2) - 24
    c.setFillColor(ORANGE_LIGHT)
    c.setStrokeColor(colors.HexColor("#E4B6A1"))
    c.rect(M, y - 51, W - 2 * M, 51, fill=1, stroke=1)
    t(c, "Toda tarea adicional deberá ser cotizada y aprobada antes de su ejecución.", M + 10, y - 19, W - 2 * M - 20, font="Helvetica-Bold", size=7.6, leading=10, color=INK)
    y -= 95
    c.setStrokeColor(LINE)
    c.line(M, y, M + 70 * mm, y)
    c.line(W - M - 70 * mm, y, W - M, y)
    t(c, p.name, M, y - 14, 70 * mm, font="Helvetica-Bold", size=7, leading=9, align="center")
    t(c, "José J. Chediack S.A.I.C.A.", W - M - 70 * mm, y - 14, 70 * mm, font="Helvetica-Bold", size=7, leading=9, align="center")
    c.showPage()


CIVIL_ROWS = [
    ("Ingeniería", "Relevamiento, inventario, topografía georreferenciada, estudio de suelos, memorias, MOP y planos.", "Documentación aprobada"),
    ("Fundaciones", "Excavación, fundación hasta 10 m3, armaduras, anclajes, canalizaciones y cámaras.", "Base liberada"),
    ("Desmontaje", "Corte coordinado, etiquetado, bajada de equipos, gabinete y monoposte hasta 18 m.", "Inventario firmado"),
    ("Traslado", "Transporte de estructura y equipos dentro del predio, con resguardo y trazabilidad.", "Elementos entregados"),
    ("Montaje", "Plan de izaje, grúa, montaje, aplomado, nivelación, torqueado y puesta a tierra.", "Monoposte montado"),
]

SYSTEM_ROWS = [
    ("Sistema radiante", "Antenas, RRU, microondas, soportes, alimentadores, jumpers, sellado, azimut y tilt.", "Sistema reinstalado"),
    ("Energía", "Gabinete, BBU, rectificadores, baterías, tableros AC/DC, climatización, PAT y protección atmosférica.", "Energía habilitada"),
    ("Fibra", "Tendido, fusiones, ODF, bandejas y certificación OTDR bidireccional.", "Protocolos OTDR"),
    ("Alarmas", "Reconexión, balizamiento si corresponde y verificación local y remota.", "Alarmas verificadas"),
    ("Integración", "Configuración, OSS/NOC, swap con rollback, logística inversa y pruebas.", "Sitio aceptado"),
]


def build_fiberquil(p):
    path = OUTPUT / "Propuesta_Fiberquil_Chediack_Mudanza.pdf"
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    c.setTitle("Propuesta Fiberquil - Chediack - Mudanza integral")
    c.setAuthor(p.name)
    fiber_cover(c, p)
    overview(c, p, "fiber")
    scope_page(c, p, "fiber", 3, "Obra civil y estructura", "Trabajos previos, fundaciones, desmontaje y montaje.", CIVIL_ROWS)
    scope_page(c, p, "fiber", 4, "Sistemas e integración", "Radio, energía, fibra, transmisión y puesta en servicio.", SYSTEM_ROWS)
    plan_page(c, p, "fiber", 5)
    controls_page(c, p, "fiber", 6)
    price_page(c, p, "fiber", 7)
    terms_page(c, p, "fiber", 8, False)
    fiber_exclusions(c, p)
    c.save()
    if len(PdfReader(str(path)).pages) != 9:
        raise RuntimeError("Fiberquil debe tener 9 páginas")
    return path


def build_bibop(p):
    path = OUTPUT / "Propuesta_Bibop_Chediack_Mudanza.pdf"
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    c.setTitle("Propuesta Bibop - Chediack - Mudanza integral")
    c.setAuthor(p.name)
    bibop_cover(c, p)
    overview(c, p, "bibop")
    scope_page(c, p, "bibop", 3, "Etapas previas y traslado", "Desde el relevamiento hasta el montaje estructural.", CIVIL_ROWS)
    scope_page(c, p, "bibop", 4, "Reinstalación y habilitación", "Sistemas activos y puesta en servicio.", SYSTEM_ROWS)
    plan_page(c, p, "bibop", 5)
    controls_page(c, p, "bibop", 6)
    price_page(c, p, "bibop", 7)
    terms_page(c, p, "bibop", 8, True)
    c.save()
    if len(PdfReader(str(path)).pages) != 8:
        raise RuntimeError("Bibop debe tener 8 páginas")
    return path


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    fiber, bibop = legacy.base.PROPOSALS
    outputs = (build_fiberquil(fiber), build_bibop(bibop))
    for path in outputs:
        print(f"OK {path.name}: {len(PdfReader(str(path)).pages)} páginas, {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()