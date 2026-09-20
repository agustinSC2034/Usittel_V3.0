/* Commercial ranges preserved from the legacy validator. Do not infer corrections. */
(function (root) {
  const current = [
    { calle: "paz", desde: 1, hasta: 1599 },
    { calle: "general paz", desde: 1, hasta: 1599 },
    { calle: "gral paz", desde: 1, hasta: 1599 },
    { calle: "gral. paz", desde: 1, hasta: 1599 },
    { calle: "4 de abril", desde: 1, hasta: 1600 },
    { calle: "4 abril", desde: 1, hasta: 1600 },
    { calle: "cuatro de abril", desde: 1, hasta: 1600 },
    { calle: "santamarina", desde: 1, hasta: 900 },
    { calle: "av Santamarina", desde: 1, hasta: 900 },
    { calle: "av Santa marina", desde: 1, hasta: 900 },
    { calle: "av. Santamarina", desde: 1, hasta: 900 },
    { calle: "av. Santa marina", desde: 1, hasta: 900 },
    { calle: "avenida Santa marina", desde: 1, hasta: 900 },
    { calle: "avenida Santamarina", desde: 1, hasta: 900 },
    { calle: "alsina", desde: 1, hasta: 1600 },
    { calle: "alcina", desde: 1, hasta: 1600 },
    { calle: "gral roca", desde: 1, hasta: 1600 },
    { calle: "gral. roca", desde: 1, hasta: 1600 },
    { calle: "general roca", desde: 1, hasta: 1600 },
    { calle: "roca", desde: 1, hasta: 1600 },
    { calle: "11 de septiembre", desde: 1, hasta: 1600 },
    { calle: "11 de setiembre", desde: 1, hasta: 1600 },
    { calle: "once de setiembre", desde: 1, hasta: 1600 },
    { calle: "once de septiembre", desde: 1, hasta: 1600 },
    { calle: "montiel", desde: 1, hasta: 1600 },
    { calle: "moreno", desde: 1, hasta: 1600 },
    { calle: "saavedra", desde: 1, hasta: 1600 },
    { calle: "savedra", desde: 1, hasta: 1600 },
    { calle: "saaveedra", desde: 1, hasta: 1600 },
    { calle: "saaveedra", desde: 1, hasta: 1600 },
    { calle: "buzon", desde: 1, hasta: 1100 },
    { calle: "av buzon", desde: 1, hasta: 1100 },
    { calle: "av buzón", desde: 1, hasta: 1100 },
    { calle: "avenida buzon", desde: 1, hasta: 1100 },
    { calle: "avenida marconi", desde: 1000, hasta: 1800 },
    { calle: "av marconi", desde: 1000, hasta: 1800 },
    { calle: "marconi", desde: 1000, hasta: 1800 },
    { calle: "avenida españa", desde: 800, hasta: 1000 },
    { calle: "av españa", desde: 800, hasta: 1000 },
    { calle: "av. españa", desde: 800, hasta: 1000 },
    { calle: "españa", desde: 800, hasta: 1000 },
    { calle: "sarmiento", desde: 850, hasta: 1800 },
    { calle: "mitre", desde: 850, hasta: 1800 },
    { calle: "sanmartin", desde: 850, hasta: 1800 },
    { calle: "san martin", desde: 850, hasta: 1800 },
    { calle: "san martín", desde: 850, hasta: 1800 },
    { calle: "pinto", desde: 850, hasta: 1800 },
    { calle: "belgrano", desde: 850, hasta: 1800 },
    { calle: "gral. belgrano", desde: 850, hasta: 1800 },
    { calle: "gral belgrano", desde: 850, hasta: 1800 },
    { calle: "general belgrano", desde: 850, hasta: 1800 },
    { calle: "maipu", desde: 850, hasta: 1800 },
    { calle: "maipú", desde: 850, hasta: 1800 },
    { calle: "veinticinco de mayo", desde: 850, hasta: 1800 },
    { calle: "25demayo", desde: 850, hasta: 1800 },
    { calle: "25 de mayo", desde: 850, hasta: 1800 },
    { calle: "constitucion", desde: 850, hasta: 1800 },
    { calle: "constitución", desde: 850, hasta: 1800 },
    { calle: "avellaneda", desde: 850, hasta: 1800 },
    { calle: "avenida avellaneda", desde: 850, hasta: 1800 },
    { calle: "av avellaneda", desde: 850, hasta: 1800 },
    { calle: "av. avellaneda", desde: 850, hasta: 1800 },
    { calle: "1 de mayo", desde: 1000, hasta: 1499 },
    { calle: "uno de mayo", desde: 1000, hasta: 1499 },
    { calle: "primero de mayo", desde: 1000, hasta: 1499 },
    { calle: "1ero de mayo", desde: 1000, hasta: 1499 },
    { calle: "pasaje primero de mayo", desde: 1000, hasta: 1499 },
    { calle: "pasaje 1 de mayo", desde: 1000, hasta: 1499 },
    { calle: "pasaje uno de mayo", desde: 1000, hasta: 1499 },
    { calle: "pasaje 1ero de mayo", desde: 1000, hasta: 1499 },
    { calle: "psje 1ero de mayo", desde: 1000, hasta: 1499 },
    { calle: "pje 1ero de mayo", desde: 1000, hasta: 1499 },
    { calle: "pje. 1ero de mayo", desde: 1000, hasta: 1499 },
    { calle: "pasaje uno de mayo", desde: 1000, hasta: 1499 },
    { calle: "pje 1 de mayo", desde: 1000, hasta: 1499 },
    { calle: "psaje 1 de mayo", desde: 1000, hasta: 1499 },
    { calle: "pje uno de mayo", desde: 1000, hasta: 1499 },
    { calle: "psaje uno de mayo", desde: 1000, hasta: 1499 },
    { calle: "roser", desde: 1500, hasta: 1599 },
    { calle: "rosser", desde: 1500, hasta: 1599 },
    { calle: "cruz roja argentina", desde: 0, hasta: 1700 },
    { calle: "cruz roja", desde: 0, hasta: 1700 },
    { calle: "cruz roja arg.", desde: 0, hasta: 1700 },
    { calle: "cruz roja arg", desde: 0, hasta: 1700 },
    { calle: "pasaje cruz roja argentina", desde: 0, hasta: 1700 },
    { calle: "pje cruz roja argentina", desde: 0, hasta: 1700 },
    { calle: "pje. cruz roja argentina", desde: 0, hasta: 1700 },
    { calle: "cruz roja argentina casa", desde: 0, hasta: 1700 },
    { calle: "cruz roja casa", desde: 0, hasta: 1700 },
    { calle: "cruz roja arg. casa", desde: 0, hasta: 1700 },
    { calle: "cruz roja arg casa", desde: 0, hasta: 1700 },
    { calle: "pasaje cruz roja argentina casa", desde: 0, hasta: 1700 },
    { calle: "pje cruz roja argentina casa", desde: 0, hasta: 1700 },
    { calle: "pje. duggan martignoni casa", desde: 0, hasta: 1700 },
    { calle: "duggan martignoni", desde: 0, hasta: 1700 },
    { calle: "dugan martinoni", desde: 0, hasta: 1700 },
    { calle: "dugan martignoni", desde: 0, hasta: 1700 },
    { calle: "pje. duggan martignoni ", desde: 0, hasta: 1700 },
    { calle: "duggan martignoni casa", desde: 0, hasta: 1700 },
    { calle: "dugan martinoni casa", desde: 0, hasta: 1700 },
    { calle: "dugan martignoni casa", desde: 0, hasta: 1700 },
    { calle: "pasaje agote casa", desde: 0, hasta: 1700 },
    { calle: "pasaje agote", desde: 0, hasta: 1700 },
    { calle: "pje. agote casa", desde: 0, hasta: 1700 },
    { calle: "pje. agote", desde: 0, hasta: 1700 },
    { calle: "pasaje luis agote casa", desde: 0, hasta: 1700 },
    { calle: "pasaje luis agote", desde: 0, hasta: 1700 },
    { calle: "pje. luis agote casa", desde: 0, hasta: 1700 },
    { calle: "pje. luis agote", desde: 0, hasta: 1700 },
    { calle: "pje. r. gutierrez casa", desde: 0, hasta: 1700 },
    { calle: "r. gutierrez", desde: 0, hasta: 1700 },
    { calle: "r gutierrez", desde: 0, hasta: 1700 },
    { calle: "r. gutierrez casa", desde: 0, hasta: 1700 },
    { calle: "pje. r. gutierrez", desde: 0, hasta: 1700 },
    { calle: "r. gutierrez casa", desde: 0, hasta: 1700 },
    { calle: "r gutierrez casa", desde: 0, hasta: 1700 },
    { calle: "pje. r gutierrez casa", desde: 0, hasta: 1700 },
    { calle: "pje. mariano castex casa", desde: 0, hasta: 1700 },
    { calle: "pje. mariano castex ", desde: 0, hasta: 1700 },
    { calle: "mariano castex", desde: 0, hasta: 1700 },
    { calle: "mariano castex casa", desde: 0, hasta: 1700 },
    { calle: "pje mariano castex", desde: 0, hasta: 1700 },
    { calle: "pje mariano castex casa", desde: 0, hasta: 1700 },
    { calle: "pasaje mariano castex casa", desde: 0, hasta: 1700 },
    { calle: "pasaje mariano castex ", desde: 0, hasta: 1700 },
    { calle: "pje. baldomero moreno casa", desde: 0, hasta: 1700 },
    { calle: "pje. baldomero moreno", desde: 0, hasta: 1700 },
    { calle: "baldomero moreno", desde: 0, hasta: 1700 },
    { calle: "baldomero moreno casa", desde: 0, hasta: 1700 },
    { calle: "pje baldomero moreno", desde: 0, hasta: 1700 },
    { calle: "pje baldomero moreno casa", desde: 0, hasta: 1700 },
    { calle: "pasaje baldomero moreno casa", desde: 0, hasta: 1700 },
    { calle: "pasaje baldomero moreno ", desde: 0, hasta: 1700 },
    { calle: "pje. crucero gral belgrano casa", desde: 0, hasta: 1700 },
    { calle: "pje. crucero gral belgrano", desde: 0, hasta: 1700 },
    { calle: "crucero gral belgrano", desde: 0, hasta: 1700 },
    { calle: "crucero gral belgrano casa", desde: 0, hasta: 1700 },
    { calle: "pje crucero gral belgrano", desde: 0, hasta: 1700 },
    { calle: "pje crucero gral belgrano casa", desde: 0, hasta: 1700 },
    { calle: "pasaje crucero gral belgrano casa", desde: 0, hasta: 1700 },
    { calle: "pasaje crucero gral belgrano ", desde: 0, hasta: 1700 },
    { calle: "pje. crucero general belgrano casa", desde: 0, hasta: 1700 },
    { calle: "pje. crucero general belgrano", desde: 0, hasta: 1700 },
    { calle: "crucero general belgrano", desde: 0, hasta: 1700 },
    { calle: "crucero general belgrano casa", desde: 0, hasta: 1700 },
    { calle: "pje crucero general belgrano", desde: 0, hasta: 1700 },
    { calle: "pje crucero general belgrano casa", desde: 0, hasta: 1700 },
    { calle: "pasaje crucero general belgrano casa", desde: 0, hasta: 1700 },
    { calle: "pasaje crucero general belgrano ", desde: 0, hasta: 1700 },
    { calle: "pje. combate de obligado casa", desde: 0, hasta: 1700 },
    { calle: "pje. combate de obligado", desde: 0, hasta: 1700 },
    { calle: "combate de obligado", desde: 0, hasta: 1700 },
    { calle: "combate de obligado casa", desde: 0, hasta: 1700 },
    { calle: "pje combate de obligado", desde: 0, hasta: 1700 },
    { calle: "pje combate de obligado casa", desde: 0, hasta: 1700 },
    { calle: "pasaje combate de obligado casa", desde: 0, hasta: 1700 },
    { calle: "pasaje combate de obligado", desde: 0, hasta: 1700 },
    { calle: "pje. combate de obligado casa", desde: 0, hasta: 1700 },
    { calle: "pje. Combatientes de malvinas", desde: 0, hasta: 1700 },
    { calle: " Combatientes de malvinas ", desde: 0, hasta: 1700 },
    { calle: " Combatientes de malvinas casa", desde: 0, hasta: 1700 },
    { calle: "pje Combatientes de malvinas ", desde: 0, hasta: 1700 },
    { calle: "pje Combatientes de malvinas casa", desde: 0, hasta: 1700 },
    { calle: "pasaje Combatientes de malvinas casa", desde: 0, hasta: 1700 },
    { calle: "pasaje Combatientes de malvinas ", desde: 0, hasta: 1700 },
    { calle: "pje. S. Austral", desde: 0, hasta: 1700 },
    { calle: " S. Austral ", desde: 0, hasta: 1700 },
    { calle: " S. Austral casa", desde: 0, hasta: 1700 },
    { calle: "pje Soberanía Austral ", desde: 0, hasta: 1700 },
    { calle: "pje Soberanía Austral casa", desde: 0, hasta: 1700 },
    { calle: "pasaje Soberanía Austral casa", desde: 0, hasta: 1700 },
    { calle: "pasaje Soberanía Austral ", desde: 0, hasta: 1700 },
    { calle: "pje. puerto argentino casa", desde: 0, hasta: 1700 },
    { calle: "pje. puerto argentino", desde: 0, hasta: 1700 },
    { calle: "puerto argentino", desde: 0, hasta: 1700 },
    { calle: "puerto argentino casa", desde: 0, hasta: 1700 },
    { calle: "pje puerto argentino", desde: 0, hasta: 1700 },
    { calle: "pje puerto argentino casa", desde: 0, hasta: 1700 },
    { calle: "pasaje puerto argentino casa", desde: 0, hasta: 1700 },
    { calle: "pasaje puerto argentino", desde: 0, hasta: 1700 },
    { calle: "pje. jose vernet casa", desde: 0, hasta: 1700 },
    { calle: "pje. jose vernet", desde: 0, hasta: 1700 },
    { calle: "jose vernet", desde: 0, hasta: 1700 },
    { calle: "jose vernet casa", desde: 0, hasta: 1700 },
    { calle: "pje jose vernet", desde: 0, hasta: 1700 },
    { calle: "pje jose vernet casa", desde: 0, hasta: 1700 },
    { calle: "pasaje jose vernet casa", desde: 0, hasta: 1700 },
    { calle: "pasaje jose vernet", desde: 0, hasta: 1700 },
    { calle: "pje. c. posta de yatasto casa", desde: 0, hasta: 1700 },
    { calle: "pje. c. posta de yatasto", desde: 0, hasta: 1700 },
    { calle: "c. posta de yatasto", desde: 0, hasta: 1700 },
    { calle: "c. posta de yatasto casa", desde: 0, hasta: 1700 },
    { calle: "pje c. posta de yatasto", desde: 0, hasta: 1700 },
    { calle: "pje c. posta de yatasto casa", desde: 0, hasta: 1700 },
    { calle: "pasaje c. posta de yatasto casa", desde: 0, hasta: 1700 },
    { calle: "pasaje c. posta de yatasto", desde: 0, hasta: 1700 },
    { calle: "pje. c. posta de yatasto casa", desde: 0, hasta: 1700 },
    { calle: "pje. posta de yatasto", desde: 0, hasta: 1700 },
    { calle: "posta de yatasto", desde: 0, hasta: 1700 },
    { calle: "posta de yatasto casa", desde: 0, hasta: 1700 },
    { calle: "posta de yatasto", desde: 0, hasta: 1700 },
    { calle: "posta de yatasto casa", desde: 0, hasta: 1700 },
    { calle: "posta de yatasto casa", desde: 0, hasta: 1700 },
    { calle: "posta de yatasto", desde: 0, hasta: 1700 },
    { calle: "av. machado", desde: 800, hasta: 1800 },
    { calle: "avenida machado", desde: 800, hasta: 1800 },
    { calle: "machado", desde: 800, hasta: 1800 },
    { calle: "arana", desde: 800, hasta: 1800 },
    { calle: "uriburu", desde: 800, hasta: 1800 },
    { calle: "pellegrini", desde: 800, hasta: 1800 },
    { calle: "montevideo", desde: 800, hasta: 1800 },
    { calle: "las heras", desde: 800, hasta: 1800 },
    { calle: "garibaldi", desde: 800, hasta: 1800 },
    { calle: "av balbin", desde: 900, hasta: 1700 },
    { calle: "balbin", desde: 900, hasta: 1700 },
    { calle: "avenida balbin", desde: 900, hasta: 1700 },
    { calle: "avenida colón", desde: 900, hasta: 1600 },
    { calle: "av colón", desde: 900, hasta: 1600 },
    { calle: "colón", desde: 900, hasta: 1600 },
    { calle: "avenida colon", desde: 900, hasta: 1600 },
    { calle: "av colon", desde: 900, hasta: 1600 },
    { calle: "colon", desde: 900, hasta: 1600 },
    { calle: "av espora", desde: 800, hasta: 1400 },
    { calle: "espora", desde: 800, hasta: 1400 },
    { calle: "avenida espora", desde: 800, hasta: 1400 },
    { calle: "guatemala", desde: 900, hasta: 1500 },
    { calle: "mejico", desde: 1000, hasta: 1400 },
    { calle: "mexico", desde: 1000, hasta: 1400 },
    { calle: "gomez", desde: 1200, hasta: 1400 },
    { calle: "colectora sur", desde: 200, hasta: 1800 },
    { calle: "colectora sur j.c pugliese", desde: 200, hasta: 1800 },
    { calle: "colectora j.c pugliese", desde: 200, hasta: 1800 },
    { calle: "colectora pugliese", desde: 200, hasta: 1800 },
    { calle: "pugliese", desde: 1000, hasta: 1800 },
    { calle: "piedrabuena", desde: 200, hasta: 1800 },
    { calle: "piñero", desde: 1200, hasta: 1600 },
    { calle: "piñiero", desde: 1200, hasta: 1600 },
    { calle: "piñeiro", desde: 1200, hasta: 1600 },
    { calle: "primera junta", desde: 200, hasta: 1800 },
    { calle: "franklin", desde: 200, hasta: 1700 },
    { calle: "colombia", desde: 200, hasta: 1600 },
    { calle: "newton", desde: 900, hasta: 1400 },
    { calle: "edison", desde: 900, hasta: 1200 },
    { calle: "cuba", desde: 900, hasta: 1400 },
    { calle: "haiti", desde: 900, hasta: 1400 },
    { calle: "jurado", desde: 1200, hasta: 1400 },
    { calle: "rauch", desde: 1000, hasta: 1400 },
    { calle: "peyrel", desde: 1200, hasta: 1400 },
    { calle: "honduras", desde: 1300, hasta: 1400 },
    { calle: "pioxii", desde: 1300, hasta: 1400 },
    { calle: "pioXII", desde: 1300, hasta: 1400 },
    { calle: "guemes", desde: 1200, hasta: 1400 },
    { calle: "güemes", desde: 1200, hasta: 1400 },
    { calle: "pasaje guernica", desde: 1600, hasta: 1800 },
    { calle: "pje guernica", desde: 1600, hasta: 1800 },
    { calle: "pje guernica", desde: 1600, hasta: 1800 },
    { calle: "pasaje orbe", desde: 0, hasta: 1800 },
    { calle: "pje orbe", desde: 0, hasta: 1800 },
    { calle: "orbe", desde: 0, hasta: 1800 },
    { calle: "pasaje c. disney", desde: 0, hasta: 1800 },
    { calle: "pje c. disney", desde: 0, hasta: 1800 },
    { calle: "c. disney", desde: 0, hasta: 1800 },
    { calle: "Pasaje interno barrio san francisco", desde: 1100, hasta: 1500 },
    { calle: "pje interno barrio san francisco", desde: 1100, hasta: 1500 },
    { calle: "Pasaje interno bo san francisco", desde: 1100, hasta: 1500 },
    { calle: "liniers", desde: 200, hasta: 1700 },
    { calle: "pje castelli", desde: 1100, hasta: 1800 },
    { calle: "Pasaje castelli", desde: 1100, hasta: 1800 },
    { calle: "Castelli", desde: 1100, hasta: 1800 },

    // ZONA DE COBERTURA B
    { calle: "antartida argentina", desde: 800, hasta: 1100 },
    { calle: "antartica argentina", desde: 800, hasta: 1100 },
    { calle: "antártida argentina", desde: 800, hasta: 1100 },
    { calle: "las malvinas argentinas", desde: 800, hasta: 1400 },
    { calle: "malvinas argentinas", desde: 800, hasta: 1400 },
    { calle: "tierra del fuego", desde: 800, hasta: 1400 },
    { calle: "tierra de fuego", desde: 800, hasta: 1400 },
    { calle: "italia", desde: 700, hasta: 1400 },
    { calle: "portugal", desde: 700, hasta: 1400 },
    { calle: "caseros", desde: 700, hasta: 1400 },
    { calle: "canada", desde: 600, hasta: 1400 },
    { calle: "canadá", desde: 600, hasta: 1400 },
    { calle: "rosalia de castro", desde: 600, hasta: 1400 },
    { calle: "rosalía de castro", desde: 600, hasta: 1400 },
    { calle: "av falucho", desde: 500, hasta: 1400 },
    { calle: "av. falucho", desde: 500, hasta: 1400 },
    { calle: "avenida falucho", desde: 500, hasta: 1400 },
    { calle: "falucho", desde: 500, hasta: 1400 },
    { calle: "venezuela", desde: 200, hasta: 1100 },
    { calle: "mayor m novia", desde: 600, hasta: 850 },
    { calle: "mayor novia", desde: 600, hasta: 850 },
    { calle: "costa rica", desde: 200, hasta: 600 },
    { calle: "panama", desde: 200, hasta: 600 },
    { calle: "panamá", desde: 200, hasta: 600 },
    { calle: "nicaragua", desde: 200, hasta: 300 },
    { calle: "pasaje dr salceda", desde: 600, hasta: 800 },
    { calle: "pje dr salceda", desde: 600, hasta: 800 },
    { calle: "pje. dr salceda", desde: 600, hasta: 800 },
    { calle: "pasaje doctor salceda", desde: 600, hasta: 800 },
    { calle: "pje doctor salceda", desde: 600, hasta: 800 },
    { calle: "dr salceda", desde: 600, hasta: 800 },
    { calle: "doctor salceda", desde: 600, hasta: 800 },
    { calle: "pasaje alicia moreau de justo", desde: 600, hasta: 800 },
    { calle: "pje alicia moreau de justo", desde: 600, hasta: 800 },
    { calle: "pje. alicia moreau de justo", desde: 600, hasta: 800 },
    { calle: "alicia moreau de justo", desde: 600, hasta: 800 },
    { calle: "pasaje 1", desde: 0, hasta: 1800 },
    { calle: "pje 1", desde: 0, hasta: 1800 },
    { calle: "pje. 1", desde: 0, hasta: 1800 },
    { calle: "pasaje 2", desde: 0, hasta: 1800 },
    { calle: "pje 2", desde: 0, hasta: 1800 },
    { calle: "pje. 2", desde: 0, hasta: 1800 },
    { calle: "pasaje ricardo rojas", desde: 0, hasta: 1800 },
    { calle: "pje ricardo rojas", desde: 0, hasta: 1800 },
    { calle: "pje. ricardo rojas", desde: 0, hasta: 1800 },
    { calle: "ricardo rojas", desde: 0, hasta: 1800 },
    { calle: "pasaje jauretche", desde: 0, hasta: 1800 },
    { calle: "pje jauretche", desde: 0, hasta: 1800 },
    { calle: "pje. jauretche", desde: 0, hasta: 1800 },
    { calle: "jauretche", desde: 0, hasta: 1800 },
    { calle: "pasaje pontaut", desde: 0, hasta: 1800 },
    { calle: "pje pontaut", desde: 0, hasta: 1800 },
    { calle: "pje. pontaut", desde: 0, hasta: 1800 },
    { calle: "pontaut", desde: 0, hasta: 1800 },
    { calle: "colectora sur j c pugliese", desde: 0, hasta: 400 },
        { calle: "colectora sur j.c pugliese", desde: 0, hasta: 400 },
        { calle: "colectora sur j.c. pugliese", desde: 0, hasta: 400 },
        { calle: "colectora sur jc pugliese", desde: 0, hasta: 400 },
        { calle: "colectora sur pugliese", desde: 0, hasta: 400 },
        { calle: "colectora pugliese", desde: 0, hasta: 400 },
        { calle: "pugliese", desde: 0, hasta: 400 },
        { calle: "piedrabuena", desde: 0, hasta: 200 },
        { calle: "primera junta", desde: 0, hasta: 200 },
        { calle: "franklin", desde: 0, hasta: 200 },
        { calle: "liniers", desde: 0, hasta: 200 },
        { calle: "pasaje fort", desde: 0, hasta: 100 },
        { calle: "pje fort", desde: 0, hasta: 100 },
        { calle: "pje. fort", desde: 0, hasta: 100 },
        { calle: "fort", desde: 0, hasta: 100 },
        { calle: "colombia", desde: 0, hasta: 200 },
        { calle: "venezuela", desde: 0, hasta: 200 },
        { calle: "costa rica", desde: 0, hasta: 200 },
        { calle: "panama", desde: 0, hasta: 200 },
        { calle: "panamá", desde: 0, hasta: 200 },
        { calle: "nicaragua", desde: 0, hasta: 200 },
        { calle: "av brasil", desde: 0, hasta: 500 },
        { calle: "av. brasil", desde: 0, hasta: 500 },
        { calle: "avenida brasil", desde: 0, hasta: 500 },
        { calle: "brasil", desde: 0, hasta: 500 },
        { calle: "massini", desde: 200, hasta: 400 },
        { calle: "carlos linstow", desde: 0, hasta: 400 },
        { calle: "linstow", desde: 0, hasta: 400 },
        { calle: "galileo", desde: 0, hasta: 100 },
        { calle: "c la pesqueria", desde: 0, hasta: 2000 },
        { calle: "la pesqueria", desde: 0, hasta: 2000 },
        { calle: "pesqueria", desde: 0, hasta: 2000 },
        { calle: "tandileofu", desde: 0, hasta: 300 },
        { calle: "quequén", desde: 0, hasta: 300 },
        { calle: "quequen", desde: 0, hasta: 300 },
        { calle: "las chilcas", desde: 100, hasta: 300 },
        { calle: "chilcas", desde: 100, hasta: 300 },
        { calle: "barrientos", desde: 0, hasta: 2000 },
        { calle: "baarrientos", desde: 0, hasta: 2000 },
        { calle: "pasaje jose barrientos", desde: 0, hasta: 2000 },
        { calle: "pje jose barrientos", desde: 0, hasta: 2000 },
        { calle: "pje. jose barrientos", desde: 0, hasta: 2000 },
        { calle: "jose barrientos", desde: 0, hasta: 2000 },
        { calle: "rivas", desde: 500, hasta: 1400 },
        { calle: "pozos", desde: 500, hasta: 1400 },
        { calle: "renis", desde: 1100, hasta: 1200 },
        { calle: "tilcara", desde: 0, hasta: 2000 },
        { calle: "fulton", desde: 0, hasta: 2000 },
        { calle: "holmberg", desde: 400, hasta: 1400 },
        { calle: "avenida fidanza", desde: 400, hasta: 1400 },
        { calle: "av fidanza", desde: 400, hasta: 1400 },
        { calle: "av. fidanza", desde: 400, hasta: 1400 },
        { calle: "fidanza", desde: 400, hasta: 1400 },
        { calle: "hudson", desde: 0, hasta: 2000 },
        { calle: "grothe", desde: 1100, hasta: 1400 },
        // ZONA D
        { calle: "hermano crisostomo", desde: 0, hasta: 2000 },
        { calle: "crisostomo", desde: 0, hasta: 2000 },
        { calle: "carriego", desde: 0, hasta: 600 },
        { calle: "tacuari", desde: 0, hasta: 700 },
        { calle: "jose hernandez", desde: 0, hasta: 400 },
        { calle: "josé hernandez", desde: 0, hasta: 400 },
        { calle: "hernandez", desde: 0, hasta: 400 },
        { calle: "santos vega", desde: 0, hasta: 300 },
        { calle: "martin fierro", desde: 0, hasta: 200 },
        { calle: "martín fierro", desde: 0, hasta: 200 },
        { calle: "jose marti", desde: 0, hasta: 100 },
        { calle: "josé marti", desde: 0, hasta: 100 },
        { calle: "josé martí", desde: 0, hasta: 100 },
        { calle: "jose martí", desde: 0, hasta: 100 },
        { calle: "marti", desde: 0, hasta: 100 },
        { calle: "martí", desde: 0, hasta: 100 },
        { calle: "cerrito", desde: 0, hasta: 300 },
        { calle: "ruben diario", desde: 0, hasta: 300 },
        { calle: "rubén diario", desde: 0, hasta: 300 },
        { calle: "ruben dario", desde: 0, hasta: 800 },
        { calle: "rubén dario", desde: 0, hasta: 800 },
        { calle: "rubén darío", desde: 0, hasta: 800 },
        { calle: "ruben darío", desde: 0, hasta: 800 },
        { calle: "avenida simon bolivar", desde: 0, hasta: 800 },
        { calle: "av simon bolivar", desde: 0, hasta: 800 },
        { calle: "av. simon bolivar", desde: 0, hasta: 800 },
        { calle: "avenida simón bolivar", desde: 0, hasta: 800 },
        { calle: "av simón bolivar", desde: 0, hasta: 800 },
        { calle: "av. simón bolivar", desde: 0, hasta: 800 },
        { calle: "simon bolivar", desde: 0, hasta: 800 },
        { calle: "simón bolivar", desde: 0, hasta: 800 },
        { calle: "bolivar", desde: 0, hasta: 800 },
        { calle: "bolívar", desde: 0, hasta: 800 },
        { calle: "los lapachos", desde: 0, hasta: 2000 },
        { calle: "lapachos", desde: 0, hasta: 2000 },
        { calle: "sargento primero luis a barrufaldi", desde: 0, hasta: 2000 },
        { calle: "sargento primero luis barrufaldi", desde: 0, hasta: 2000 },
        { calle: "sargento luis a barrufaldi", desde: 0, hasta: 2000 },
        { calle: "sargento luis barrufaldi", desde: 0, hasta: 2000 },
        { calle: "luis a barrufaldi", desde: 0, hasta: 2000 },
        { calle: "luis barrufaldi", desde: 0, hasta: 2000 },
        { calle: "barrufaldi", desde: 0, hasta: 2000 },
        { calle: "guido dinelli", desde: 0, hasta: 2000 },
        { calle: "dinelli", desde: 0, hasta: 2000 },
        { calle: "carola lorenzini", desde: 200, hasta: 400 },
        { calle: "lorenzini", desde: 200, hasta: 400 },
        { calle: "eduardo olivero", desde: 0, hasta: 2000 },
        { calle: "olivero", desde: 0, hasta: 2000 },
        { calle: "c. fels", desde: 0, hasta: 2000 },
        { calle: "c fels", desde: 0, hasta: 2000 },
        { calle: "fels", desde: 0, hasta: 2000 },
        { calle: "pedro hansen", desde: 300, hasta: 400 },
        { calle: "hansen", desde: 300, hasta: 400 },
        { calle: "martin fierro", desde: 400, hasta: 800 },
        { calle: "martín fierro", desde: 400, hasta: 800 },
        { calle: "f de la cruz", desde: 1000, hasta: 1200 },
        { calle: "f. de la cruz", desde: 1000, hasta: 1200 },
        { calle: "de la cruz", desde: 1000, hasta: 1200 },
        { calle: "c santos vega", desde: 0, hasta: 2000 },
        { calle: "c. santos vega", desde: 0, hasta: 2000 },
        { calle: "av fleming", desde: 0, hasta: 2000 },
        { calle: "av. fleming", desde: 0, hasta: 2000 },
        { calle: "avenida fleming", desde: 0, hasta: 2000 },
        { calle: "fleming", desde: 0, hasta: 2000 },
        { calle: "roser", desde: 1100, hasta: 1800 },
        { calle: "rosser", desde: 1100, hasta: 1800 },
        { calle: "pasaje uruguay", desde: 0, hasta: 2000 },
        { calle: "pje uruguay", desde: 0, hasta: 2000 },
        { calle: "pje. uruguay", desde: 0, hasta: 2000 },
        { calle: "uruguay", desde: 0, hasta: 2000 },
        { calle: "carlos gardel", desde: 1000, hasta: 1800 },
        { calle: "gardel", desde: 1000, hasta: 1800 },
        { calle: "av s serrano", desde: 1400, hasta: 1800 },
        { calle: "av. s serrano", desde: 1400, hasta: 1800 },
        { calle: "av s. serrano", desde: 1400, hasta: 1800 },
        { calle: "av. s. serrano", desde: 1400, hasta: 1800 },
        { calle: "avenida s serrano", desde: 1400, hasta: 1800 },
        { calle: "avenida s. serrano", desde: 1400, hasta: 1800 },
        { calle: "serrano", desde: 1400, hasta: 1800 },
        { calle: "s serrano", desde: 1400, hasta: 1800 },
        { calle: "s. serrano", desde: 1400, hasta: 1800 },
        { calle: "fugl", desde: 1000, hasta: 1800 },
        { calle: "loberia", desde: 1100, hasta: 1500 },
        { calle: "lobería", desde: 1100, hasta: 1500 },
        { calle: "larrea", desde: 1000, hasta: 1600 },
        { calle: "avenida lopez de osornio", desde: 1000, hasta: 1300 },
        { calle: "av lopez de osornio", desde: 1000, hasta: 1300 },
        { calle: "av. lopez de osornio", desde: 1000, hasta: 1300 },
        { calle: "avenida lópez de osornio", desde: 1000, hasta: 1300 },
        { calle: "av lópez de osornio", desde: 1000, hasta: 1300 },
        { calle: "av. lópez de osornio", desde: 1000, hasta: 1300 },
        { calle: "lopez de osornio", desde: 1000, hasta: 1300 },
        { calle: "lópez de osornio", desde: 1000, hasta: 1300 },
        { calle: "general de la cruz", desde: 0, hasta: 2000 },
        { calle: "gral de la cruz", desde: 0, hasta: 2000 },
        { calle: "gral. de la cruz", desde: 0, hasta: 2000 },
        { calle: "de la cruz", desde: 0, hasta: 2000 },

        // direcciones nuevas:
        { calle: "4 de abril", desde: 0, hasta: 1499 }, //
    { calle: "25 de mayo", desde: 849, hasta: 1799 }, //
    { calle: "11 de septiembre", desde: 0, hasta: 1499 }, //

    { calle: "agote l.", desde: 0, hasta: 1799 }, //
    { calle: "agote l", desde: 0, hasta: 1799 },
    { calle: "agote", desde: 0, hasta: 1799 },

    { calle: "alem", desde: 899, hasta: 1499 }, //
    { calle: "alsina", desde: 0, hasta: 1499 }, //

    { calle: "ant. argentina", desde: 799, hasta: 1099 }, //
    { calle: "antartida argentina", desde: 799, hasta: 1099 },

    { calle: "arana", desde: 749, hasta: 1799 }, //
    { calle: "avellaneda", desde: 849, hasta: 1799 }, //
    { calle: "balbin", desde: 899, hasta: 1699 }, //
    { calle: "belgrano", desde: 849, hasta: 1799 }, //
    { calle: "bolivar", desde: 0, hasta: 799 }, //
    { calle: "brasil", desde: 0, hasta: 599 }, //
    { calle: "buzon", desde: 0, hasta: 1099 }, //
    { calle: "feels", desde: 0, hasta: 1999 }, //
    { calle: "canada", desde: 600, hasta: 1399 }, //
    { calle: "canadá", desde: 600, hasta: 1399 },

    { calle: "carlos gardel", desde: 1000, hasta: 1799 }, //
    { calle: "gardel", desde: 1000, hasta: 1799 },

    { calle: "carriego", desde: 0, hasta: 699 }, //
    { calle: "caseros", desde: 600, hasta: 1399 }, //

    { calle: "castex m.", desde: 0, hasta: 1799 }, //
    { calle: "castex", desde: 0, hasta: 1799 },

    { calle: "pje. nervo a.", desde: 0, hasta: 299 }, //
    { calle: "pje nervo a", desde: 0, hasta: 299 },
    { calle: "pasaje nervo a.", desde: 0, hasta: 299 },
    { calle: "pasaje nervo a", desde: 0, hasta: 299 },
    { calle: "pasaje nervo", desde: 0, hasta: 299 },
    { calle: "nervo", desde: 0, hasta: 299 },

    { calle: "colombia", desde: 1, hasta: 1399 }, //
    { calle: "colon", desde: 899, hasta: 1499 }, //

    { calle: "combate de obligado", desde: 0, hasta: 1799 }, //
    { calle: "constitucion", desde: 849, hasta: 1799 }, //
    { calle: "costa rica", desde: 1, hasta: 599 }, //

    { calle: "crucero gral. belgrano", desde: 0, hasta: 1799 }, //
    { calle: "crucero general belgrano", desde: 0, hasta: 1799 },
    { calle: "crucero gral belgrano", desde: 0, hasta: 1799 },

    { calle: "cruz roja argentina", desde: 0, hasta: 1799 }, //
    { calle: "cruz roja", desde: 0, hasta: 1799 },

    { calle: "dinelli", desde: 0, hasta: 1999 }, //
    { calle: "españa", desde: 849, hasta: 1799 }, //
    { calle: "falucho", desde: 500, hasta: 1399 }, //

    { calle: "fernandez de la cruz", desde: 1000, hasta: 1999 }, //
    { calle: "de la cruz", desde: 1000, hasta: 1999 },

    { calle: "fernandez moreno baldomero", desde: 0, hasta: 1799 }, //
    { calle: "baldomero fernandez moreno", desde: 0, hasta: 1799 },
    { calle: "fernandez moreno", desde: 0, hasta: 1799 },

    { calle: "fidanza", desde: 399, hasta: 1399 }, //
    { calle: "franklin", desde: 1, hasta: 1669 }, //
    { calle: "fugl", desde: 1000, hasta: 1799 }, //
    { calle: "fulton", desde: 299, hasta: 899 }, //

    { calle: "galileo galilei", desde: 1, hasta: 99 }, //
    { calle: "galileo", desde: 1, hasta: 99 },

    { calle: "garibaldi", desde: 749, hasta: 1799 }, //
    { calle: "grothe", desde: 1199, hasta: 1399 }, //
    { calle: "guernica", desde: 1600, hasta: 1799 }, //
    { calle: "guernica", desde: 1699, hasta: 1669 }, //

    { calle: "gutierrez r.", desde: 0, hasta: 1799 }, //
    { calle: "gutierrez", desde: 0, hasta: 1799 },

    { calle: "hansen", desde: 0, hasta: 1999 }, //
    { calle: "hernandez", desde: 0, hasta: 399 }, //

    { calle: "hno. crisostomo", desde: 600, hasta: 1799 }, //
    { calle: "hermano crisostomo", desde: 600, hasta: 1799 },
    { calle: "crisostomo", desde: 600, hasta: 1799 },

    { calle: "holmberg", desde: 399, hasta: 1399 }, //
    { calle: "hudson", desde: 1, hasta: 1000 }, //
    { calle: "italia", desde: 699, hasta: 1399 }, //

    { calle: "la pesqueria", desde: 1, hasta: 399 }, //
    { calle: "pesqueria", desde: 1, hasta: 399 },

    { calle: "larrea", desde: 1000, hasta: 1799 }, //

    { calle: "las chilcas", desde: 99, hasta: 299 }, //
    { calle: "chilcas", desde: 99, hasta: 299 },

    { calle: "las heras", desde: 749, hasta: 1799 }, //
    { calle: "las malvinas", desde: 699, hasta: 1399 }, //
    { calle: "malvinas", desde: 699, hasta: 1399 },

    { calle: "liniers", desde: 1, hasta: 1699 }, //
    { calle: "linstow", desde: 1, hasta: 399 }, //
    { calle: "loberia", desde: 1000, hasta: 1799 }, //
    { calle: "lopez de osornio", desde: 1000, hasta: 1700 }, //
    { calle: "lorenzini", desde: 0, hasta: 1999 }, //
    { calle: "machado", desde: 749, hasta: 1799 }, //
    { calle: "maipu", desde: 849, hasta: 1799 }, //
    { calle: "marconi", desde: 849, hasta: 1799 }, //
    { calle: "marti", desde: 0, hasta: 799 }, //

    { calle: "martignoni d.", desde: 0, hasta: 1799 }, //
    { calle: "martignoni", desde: 0, hasta: 1799 },

    { calle: "martin fierro", desde: 0, hasta: 799 }, //
    { calle: "massini", desde: 199, hasta: 399 }, //

    { calle: "mayor novoa marcelo", desde: 849, hasta: 699 }, //
    { calle: "mayor novoa", desde: 849, hasta: 699 },
    { calle: "novoa", desde: 849, hasta: 699 },

    { calle: "mitre", desde: 849, hasta: 1799 }, //
    { calle: "montevideo", desde: 749, hasta: 1799 }, //
    { calle: "montiel", desde: 0, hasta: 1499 }, //
    { calle: "moreno", desde: 0, hasta: 1499 }, //
    { calle: "nicaragua", desde: 1, hasta: 299 }, //
    { calle: "olivero", desde: 0, hasta: 1999 }, //
    { calle: "panama", desde: 1, hasta: 599 }, //

    { calle: "paroissiend dr.", desde: 0, hasta: 1799 }, //
    { calle: "dr paroissien", desde: 0, hasta: 1799 },
    { calle: "paroissien", desde: 0, hasta: 1799 },

    { calle: "paz", desde: 0, hasta: 1499 }, //
    { calle: "pellegrini", desde: 749, hasta: 1799 }, //
    { calle: "piedrabuena", desde: 1, hasta: 1799 }, //
    { calle: "pinto", desde: 849, hasta: 1799 }, //

    { calle: "pje. alicia moreau de justo", desde: 600, hasta: 799 }, //
    { calle: "pasaje alicia moreau de justo", desde: 600, hasta: 799 },
    { calle: "alicia moreau de justo", desde: 600, hasta: 799 },

    { calle: "junco a.", desde: 0, hasta: 1999 }, //
    { calle: "junco", desde: 0, hasta: 1999 },

    { calle: "pje. barrientos", desde: 999, hasta: 1199 }, //
    { calle: "pasaje barrientos", desde: 999, hasta: 1199 },
    { calle: "barrientos", desde: 999, hasta: 1199 },

    { calle: "pje. castelli", desde: 1199, hasta: 1299 }, //
    { calle: "pasaje castelli", desde: 1199, hasta: 1299 },
    { calle: "castelli", desde: 1199, hasta: 1299 },

    { calle: "pje. disney", desde: 1699, hasta: 1799 }, //
    { calle: "pasaje disney", desde: 1699, hasta: 1799 },
    { calle: "disney", desde: 1699, hasta: 1799 },

    { calle: "pje. dr. salceda", desde: 600, hasta: 799 }, //
    { calle: "pasaje dr. salceda", desde: 600, hasta: 799 },
    { calle: "pasaje dr salceda", desde: 600, hasta: 799 },
    { calle: "dr salceda", desde: 600, hasta: 799 },
    { calle: "salceda", desde: 600, hasta: 799 },

    { calle: "pje. fort", desde: 1, hasta: 99 }, //
    { calle: "pasaje fort", desde: 1, hasta: 99 },
    { calle: "fort", desde: 1, hasta: 99 },

    { calle: "pje. gavazzi", desde: 400, hasta: 499 }, //
    { calle: "pasaje gavazzi", desde: 400, hasta: 499 },
    { calle: "gavazzi", desde: 400, hasta: 499 },

    { calle: "pje. orbe", desde: 1699, hasta: 1799 }, //
    { calle: "pasaje orbe", desde: 1699, hasta: 1799 },
    { calle: "orbe", desde: 1699, hasta: 1799 },

    { calle: "pje. piñero", desde: 1599, hasta: 1199 }, //
    { calle: "pasaje piñero", desde: 1599, hasta: 1199 },
    { calle: "piñero", desde: 1599, hasta: 1199 },

    { calle: "pje. primero de mayo", desde: 1099, hasta: 1499 }, //
    { calle: "pasaje primero de mayo", desde: 1099, hasta: 1499 },
    { calle: "primero de mayo", desde: 1099, hasta: 1499 },

    { calle: "pje. renis", desde: 1099, hasta: 1199 }, //
    { calle: "pasaje renis", desde: 1099, hasta: 1199 },
    { calle: "renis", desde: 1099, hasta: 1199 },

    { calle: "pje. santa ana", desde: 1399, hasta: 1499 }, //
    { calle: "pasaje santa ana", desde: 1399, hasta: 1499 },
    { calle: "santa ana", desde: 1399, hasta: 1499 },

    { calle: "pje. uruguay", desde: 1000, hasta: 1150 }, //
    { calle: "pasaje uruguay", desde: 1000, hasta: 1150 },
    { calle: "uruguay", desde: 1000, hasta: 1150 },

    { calle: "pje. varas", desde: 400, hasta: 499 }, //
    { calle: "pasaje varas", desde: 400, hasta: 499 },
    { calle: "varas", desde: 400, hasta: 499 },

    { calle: "portugal", desde: 700, hasta: 1399 }, //
    { calle: "pozos", desde: 499, hasta: 1399 }, //
    { calle: "primera junta", desde: 1, hasta: 1799 }, //
    { calle: "puerto argentino", desde: 0, hasta: 1799 }, //
    { calle: "pugliese este", desde: 0, hasta: 1799 }, //
    { calle: "pugliese oeste", desde: 0, hasta: 1799 }, //
    { calle: "quequen", desde: 1, hasta: 299 }, //
    { calle: "roca", desde: 0, hasta: 1499 }, //
    { calle: "rosalia de castro", desde: 600, hasta: 1399 }, //
    { calle: "rosser", desde: 1000, hasta: 1799 }, //

    { calle: "ruben dario", desde: 0, hasta: 799 }, //
    { calle: "saavedra", desde: 0, hasta: 1499 }, //

    { calle: "salustiano rivas", desde: 499, hasta: 1399 }, //
    { calle: "rivas", desde: 499, hasta: 1399 },

    { calle: "san martin", desde: 849, hasta: 1799 }, //
    { calle: "santamarina", desde: 0, hasta: 899 }, //
    { calle: "santos vega", desde: 0, hasta: 299 }, //
    { calle: "sarmiento", desde: 849, hasta: 1799 }, //
    { calle: "serrano", desde: 1000, hasta: 1799 }, //
    { calle: "soberania austral", desde: 0, hasta: 1799 }, //
    { calle: "tacuari", desde: 0, hasta: 799 }, //
    { calle: "tandileofu", desde: 1, hasta: 299 }, //
    { calle: "tierra del fuego", desde: 699, hasta: 1399 }, //
    { calle: "tilcara", desde: 1, hasta: 1000 }, //
    { calle: "tweesdale", desde: 0, hasta: 1999 }, //
    { calle: "uriburu", desde: 749, hasta: 1799 }, //
    { calle: "venezuela", desde: 1, hasta: 1099 }, //

    { calle: "vernet j.", desde: 0, hasta: 1799 }, //
    { calle: "vernet", desde: 0, hasta: 1799 },
    { calle: "jose vernet", desde: 0, hasta: 1799 }
  ];

  // NUEVAS ZONAS DE COBERTURA - PROXIMAMENTE
  const future = [
  ];
  const polygon = [
    [-37.30705, -59.12641],
    [-37.30645, -59.12603],
    [-37.3063, -59.12617],
    [-37.30456, -59.12388],
    [-37.30691, -59.12062],
    [-37.31248, -59.11372], //F
    [-37.32471, -59.09797], // G
    [-37.33022, -59.10464], // G2
    [-37.32946, -59.1057], // G3
    [-37.33202, -59.10898], // G4
    [-37.33285, -59.11091], // G5
    [-37.33628, -59.10888], // H
    [-37.34098, -59.12071], // H1
    [-37.33163, -59.12642], // H2
    [-37.3323, -59.12859], // I
    [-37.32188, -59.135],
    [-37.32228, -59.13636],
    [-37.31302, -59.14202],
    [-37.31163, -59.13815],
    [-37.31196, -59.13788],
    [-37.30854, -59.12915],
    [-37.30813, -59.12942],
  ];
  const data = { current, future, polygon };
  if (typeof module !== "undefined" && module.exports) module.exports = data;
  else root.UsittelCoverageData = data;
})(typeof window !== "undefined" ? window : globalThis);
