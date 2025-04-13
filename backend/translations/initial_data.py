#backend/translations/initial_data.py

from .models import ObjectTranslation

initial_translations = [
    # Personas y partes del cuerpo
    {"english_label": "person", "spanish": "persona", "quechua": "runa"},
    {"english_label": "eye", "spanish": "ojo", "quechua": "ñawi"},
    {"english_label": "nose", "spanish": "nariz", "quechua": "sinqa"},
    {"english_label": "mouth", "spanish": "boca", "quechua": "simi"},
    {"english_label": "ear", "spanish": "oreja", "quechua": "rinri"},
    {"english_label": "hand", "spanish": "mano", "quechua": "maki"},
    {"english_label": "foot", "spanish": "pie", "quechua": "chaki"},
    {"english_label": "head", "spanish": "cabeza", "quechua": "uma"},

    # Animales
    {"english_label": "bird", "spanish": "pájaro", "quechua": "pisqu"},
    {"english_label": "cat", "spanish": "gato", "quechua": "michi"},
    {"english_label": "dog", "spanish": "perro", "quechua": "allqu"},
    {"english_label": "horse", "spanish": "caballo", "quechua": "kawallu"},
    {"english_label": "sheep", "spanish": "oveja", "quechua": "uwiha"},
    {"english_label": "cow", "spanish": "vaca", "quechua": "waka"},
    {"english_label": "elephant", "spanish": "elefante", "quechua": "hatun uywana"},
    {"english_label": "bear", "spanish": "oso", "quechua": "ukumari"},
    {"english_label": "zebra", "spanish": "cebra", "quechua": "siwra"},
    {"english_label": "giraffe", "spanish": "jirafa", "quechua": "hatun kunka"},
    {"english_label": "mouse", "spanish": "ratón", "quechua": "ukucha"},
    {"english_label": "rabbit", "spanish": "conejo", "quechua": "q'uwi"},
    {"english_label": "duck", "spanish": "pato", "quechua": "patu"},
    {"english_label": "chicken", "spanish": "pollo", "quechua": "wallpa"},

    # Salón de clases
    {"english_label": "chair", "spanish": "silla", "quechua": "tiana"},
    {"english_label": "table", "spanish": "mesa", "quechua": "qhatu"},
    {"english_label": "desk", "spanish": "escritorio", "quechua": "qillqana qhatu"},
    {"english_label": "book", "spanish": "libro", "quechua": "qillqa"},
    {"english_label": "backpack", "spanish": "mochila", "quechua": "q'ipirina"},
    {"english_label": "pen", "spanish": "lapicero", "quechua": "qillqana"},
    {"english_label": "pencil", "spanish": "lápiz", "quechua": "qillqana k'ullu"},
    {"english_label": "scissors", "spanish": "tijeras", "quechua": "khuchuna"},
    {"english_label": "ruler", "spanish": "regla", "quechua": "chiqanchana"},
    {"english_label": "clock", "spanish": "reloj", "quechua": "pacha tupuna"},
    {"english_label": "board", "spanish": "pizarra", "quechua": "qillqana pata"},
    {"english_label": "pencil case", "spanish": "cartuchera", "quechua": "qillqana churana"},
    {"english_label": "paper", "spanish": "papel", "quechua": "raphi"},
    {"english_label": "eraser", "spanish": "borrador", "quechua": "pichana"},
    {"english_label": "notebook", "spanish": "cuaderno", "quechua": "qillqana mayt'u"},

    # Dispositivos electrónicos
    {"english_label": "laptop", "spanish": "portátil", "quechua": "antañiqiq"},
    {"english_label": "computer", "spanish": "computadora", "quechua": "yuyaychaq"},
    {"english_label": "keyboard", "spanish": "teclado", "quechua": "ñit'ina"},
    {"english_label": "mouse", "spanish": "ratón", "quechua": "ukucha"},
    {"english_label": "cell phone", "spanish": "celular", "quechua": "willakamay"},
    {"english_label": "tv", "spanish": "televisor", "quechua": "rikuchiq"},
    {"english_label": "remote", "spanish": "control remoto", "quechua": "karumanaq"},
    {"english_label": "printer", "spanish": "impresora", "quechua": "qillqa lluqsichiq"},
    {"english_label": "projector", "spanish": "proyector", "quechua": "rikuchiq"},
    {"english_label": "speaker", "spanish": "altavoz", "quechua": "waqachiq"},
    {"english_label": "headphones", "spanish": "audífonos", "quechua": "rinri uyariq"},

    # Muebles y elementos del hogar
    {"english_label": "couch", "spanish": "sofá", "quechua": "samarina"},
    {"english_label": "bed", "spanish": "cama", "quechua": "puñuna"},
    {"english_label": "dining table", "spanish": "mesa de comedor", "quechua": "mikhuna qhatu"},
    {"english_label": "chair", "spanish": "silla", "quechua": "tiana"},
    {"english_label": "bench", "spanish": "banca", "quechua": "tiyarina"},
    {"english_label": "bookshelf", "spanish": "estante", "quechua": "qillqa churana"},
    {"english_label": "cabinet", "spanish": "gabinete", "quechua": "churana"},
    {"english_label": "lamp", "spanish": "lámpara", "quechua": "k'anchana"},
    {"english_label": "mirror", "spanish": "espejo", "quechua": "rirpu"},
    {"english_label": "window", "spanish": "ventana", "quechua": "t'uqu"},
    {"english_label": "door", "spanish": "puerta", "quechua": "punku"},
    {"english_label": "curtain", "spanish": "cortina", "quechua": "pakana"},

    # Cocina y comedor
    {"english_label": "refrigerator", "spanish": "refrigerador", "quechua": "chiriyachina"},
    {"english_label": "microwave", "spanish": "microondas", "quechua": "kununchiq"},
    {"english_label": "oven", "spanish": "horno", "quechua": "q'onchana"},
    {"english_label": "sink", "spanish": "lavabo", "quechua": "mayllana"},
    {"english_label": "stove", "spanish": "cocina", "quechua": "yanuna"},
    {"english_label": "plate", "spanish": "plato", "quechua": "p'uku"},
    {"english_label": "cup", "spanish": "taza", "quechua": "qiru"},
    {"english_label": "fork", "spanish": "tenedor", "quechua": "mikhuna hapina"},
    {"english_label": "spoon", "spanish": "cuchara", "quechua": "wislla"},
    {"english_label": "knife", "spanish": "cuchillo", "quechua": "kuchuna"},
    {"english_label": "bowl", "spanish": "tazón", "quechua": "chuwa"},
    {"english_label": "bottle", "spanish": "botella", "quechua": "puyñu"},
    {"english_label": "toaster", "spanish": "tostadora", "quechua": "t'anta kununchiq"},

    # Naturaleza
    {"english_label": "tree", "spanish": "árbol", "quechua": "mallki"},
    {"english_label": "flower", "spanish": "flor", "quechua": "t'ika"},
    {"english_label": "plant", "spanish": "planta", "quechua": "yura"},
    {"english_label": "grass", "spanish": "pasto", "quechua": "q'achu"},
    {"english_label": "mountain", "spanish": "montaña", "quechua": "urqu"},
    {"english_label": "river", "spanish": "río", "quechua": "mayu"},
    {"english_label": "stone", "spanish": "piedra", "quechua": "rumi"},
    {"english_label": "sun", "spanish": "sol", "quechua": "inti"},
    {"english_label": "moon", "spanish": "luna", "quechua": "killa"},
    {"english_label": "star", "spanish": "estrella", "quechua": "quyllur"},
    {"english_label": "cloud", "spanish": "nube", "quechua": "phuyu"},

    # Vehículos y transporte
    {"english_label": "car", "spanish": "auto", "quechua": "antawa"},
    {"english_label": "bicycle", "spanish": "bicicleta", "quechua": "iskay-llanta"},
    {"english_label": "motorcycle", "spanish": "motocicleta", "quechua": "antawa takaq"},
    {"english_label": "bus", "spanish": "autobús", "quechua": "hatun antawa"},
    {"english_label": "truck", "spanish": "camión", "quechua": "q'ipi antawa"},
    {"english_label": "airplane", "spanish": "avión", "quechua": "phawaq antawa"},
    {"english_label": "boat", "spanish": "bote", "quechua": "yaku antawa"},
    {"english_label": "train", "spanish": "tren", "quechua": "kaska ñan antawa"},

    # Ropa y accesorios
    {"english_label": "hat", "spanish": "sombrero", "quechua": "chuku"},
    {"english_label": "shirt", "spanish": "camisa", "quechua": "unku"},
    {"english_label": "pants", "spanish": "pantalón", "quechua": "wara"},
    {"english_label": "shoes", "spanish": "zapatos", "quechua": "usut'a"},
    {"english_label": "glasses", "spanish": "lentes", "quechua": "ñawi qhawana"},
    {"english_label": "watch", "spanish": "reloj de pulsera", "quechua": "maki pacha"},
    {"english_label": "tie", "spanish": "corbata", "quechua": "kunka watana"},
    {"english_label": "handbag", "spanish": "cartera", "quechua": "wayaqa"},

    # Alimentos
    {"english_label": "apple", "spanish": "manzana", "quechua": "mansana"},
    {"english_label": "banana", "spanish": "plátano", "quechua": "plátano"},
    {"english_label": "orange", "spanish": "naranja", "quechua": "chilina"},
    {"english_label": "bread", "spanish": "pan", "quechua": "t'anta"},
    {"english_label": "pizza", "spanish": "pizza", "quechua": "pizza"},
    {"english_label": "cake", "spanish": "pastel", "quechua": "misk'i t'anta"},
    {"english_label": "sandwich", "spanish": "sándwich", "quechua": "t'anta churasqa"},
    {"english_label": "hot dog", "spanish": "perro caliente", "quechua": "k'anka t'anta"},
    {"english_label": "carrot", "spanish": "zanahoria", "quechua": "sanahoria"},
    {"english_label": "broccoli", "spanish": "brócoli", "quechua": "q'umir mikhuna"}
]

def load_initial_data():
    """Carga las traducciones iniciales en la base de datos."""
    for trans in initial_translations:
        ObjectTranslation.objects.get_or_create(
            english_label=trans['english_label'].lower(),
            defaults={
                'spanish': trans['spanish'],
                'quechua': trans['quechua']
            }
        )