from pathlib import Path

import generate_chediack_proposals as generator


generator.SOURCE = Path(
    r"C:\Users\Aguus\OneDrive\Escritorio\Propuestas\Propuesta_iTTel_Chediack_Mudanza.pdf"
)


if __name__ == "__main__":
    generator.main()
