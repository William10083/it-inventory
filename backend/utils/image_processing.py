from PIL import Image, ExifTags, ImageFilter
import io
import os
import numpy as np

# Intentar importar ultralytics para Deep Learning Local
try:
    from ultralytics import YOLO
    # Cargar modelo Nano (el más ligero/rápido)
    # Se descargará automáticamente en la primera ejecución
    print("DEBUG: Loading YOLOv8n model for local Deep Learning...")
    model = YOLO("yolov8n.pt") 
    YOLO_AVAILABLE = True
except ImportError:
    print("WARNING: 'ultralytics' not installed. Deep Learning features disabled.")
    YOLO_AVAILABLE = False
except Exception as e:
    print(f"WARNING: Error loading YOLO model: {e}")
    YOLO_AVAILABLE = False

def detect_object_yolo(img_pil):
    """
    Usa YOLOv8 localmente para detectar el BBox del objeto principal.
    Retorna (left, top, right, bottom) o None.
    """
    if not YOLO_AVAILABLE:
        return None

    try:
        # YOLO espera numpy array o path, pero soporta PIL direct
        # Clases COCO relevantes: Originalmente filtramos, pero un "Teléfono Fijo" puede ser cualquier cosa.
        # Mejor estrategia: Encontrar el objeto con MAYOR confianza/tamaño en la imagen, sea lo que sea.
        
        results = model(img_pil, verbose=False) # Inferencia
        
        # Buscar el objeto con mayor confianza
        best_box = None
        max_conf = 0.0
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                class_name = model.names[cls]
                
                # Debug logging para ver qué detecta
                print(f"DEBUG: YOLO Candidate: '{class_name}' (conf={conf:.2f})")

                # Aceptamos cualquier objeto con confianza > 0.3
                # Asumimos que la foto es del activo, así que el objeto dominante es el que queremos.
                if conf > 0.3 and conf > max_conf:
                    max_conf = conf
                    coords = box.xyxy[0].tolist() 
                    best_box = coords 
        
        if best_box:
            xmin, ymin, xmax, ymax = best_box
            print(f"DEBUG: YOLO selected best object with conf {max_conf:.2f}: {best_box}")
            return (xmin, ymin, xmax, ymax)
            
    except Exception as e:
        print(f"ERROR in YOLO inference: {e}")
    
    return None

def smart_crop_image(img, padding_percent=0.15):
    """
    1. Heurística de Rotación.
    2. Deep Learning Crop (YOLO).
    3. Fallback a Bordes.
    Padding ajustado al 15% (base) para un equilibrio entre safety y crop.
    """
    
    # 1. HEURÍSTICA DE ROTACIÓN (Siempre activa)
    # Regla: Si Alto > Ancho (Vertical), rotar a Horizontal.
    # User feedback: "roto pero lado contrario" -> Cambiamos de -90 a 90.
    w, h = img.size
    print(f"DEBUG: Pre-processing size: {w}x{h}")
    
    if h > w:
        print("DEBUG: Image is Vertical (H > W). Applying heuristic rotation (90 deg).")
        img = img.rotate(90, expand=True) 
        w, h = img.size 

    # 2. DEEP LEARNING CROP (Local YOLO)
    yolo_bbox = detect_object_yolo(img)
    final_img = img # Default to current img

    if yolo_bbox:
        left, top, right, bottom = yolo_bbox
        
        # width/height of BOx
        box_w = right - left
        box_h = bottom - top
        
        # Si el objeto detectado es muy pequeño (< 40% del ancho de la imagen), 
        # asumimos que es una parte (ej. auricular) y aumentamos padding considerablemente.
        if box_w < (w * 0.4):
             print(f"DEBUG: Detected object is small/narrow (width {box_w/w:.2%}). Increasing padding to capture context.")
             padding_percent = padding_percent * 2.5 # Aumentamos de 2.0 a 2.5 (aprox 37.5% total) para evitar cortes

        # Validar consistencia
        left = max(0, left)
        top = max(0, top)
        right = min(w, right)
        bottom = min(h, bottom)
        
        # Añadir padding
        pad_w = w * padding_percent
        pad_h = h * padding_percent
        
        left = max(0, left - pad_w)
        top = max(0, top - pad_h)
        right = min(w, right + pad_w)
        bottom = min(h, bottom + pad_h)
        
        final_img = img.crop((left, top, right, bottom))

    else:
        # 3. FALLBACK: Detección de Bordes Clásica
        print("DEBUG: Using basic edge-detection crop (YOLO found nothing).")
        try:
            gray = img.convert("L")
            blurred = gray.filter(ImageFilter.GaussianBlur(radius=2))
            edges = blurred.filter(ImageFilter.FIND_EDGES)
            threshold = 50
            bw = edges.point(lambda x: 0 if x < threshold else 255)
            bbox = bw.getbbox()
            
            if bbox:
                left, top, right, bottom = bbox
                pad_w = int(w * 0.05)
                pad_h = int(h * 0.05)
                left = max(0, left - pad_w)
                top = max(0, top - pad_h)
                right = min(w, right + pad_w)
                bottom = min(h, bottom + pad_h)
                final_img = img.crop((left, top, right, bottom))
        except Exception as e:
            print(f"DEBUG: Edge crop failed: {e}")
            final_img = img

    # 4. POST-CROP CHECK: FORZAR HORIZONTAL
    # A veces el crop (especialmente de etiquetas) vuelve a dejar la imagen vertical.
    # Si sigue siendo vertical, la rotamos 90 grados para asegurar legibilidad.
    fw, fh = final_img.size
    print(f"DEBUG: Final Image Size: {fw}x{fh} (Aspect Ratio: {fw/fh:.2f})")
    
    if fh > fw:
        print("DEBUG: Final Result is still Vertical. Forcing Landscape (90 deg).")
        final_img = final_img.rotate(90, expand=True)

    return final_img

def process_and_save_image(file_content: bytes, save_path: str):
    """
    Procesa la imagen (rotación, crop, conversión) y la guarda en disco.
    """
    try:
        print(f"DEBUG: Processing image -> {save_path}")
        img = Image.open(io.BytesIO(file_content))
        print(f"DEBUG: Original Image Size: {img.size}, Mode: {img.mode}")
        
        # 1. Corregir Orientación EXIF
        try:
            for orientation in ExifTags.TAGS.keys():
                if ExifTags.TAGS[orientation] == 'Orientation':
                    break
            exif = dict(img._getexif().items())
            print(f"DEBUG: EXIF Orientation: {exif.get(orientation, 'None')}")
            
            if exif[orientation] == 3: img = img.rotate(180, expand=True)
            elif exif[orientation] == 6: img = img.rotate(270, expand=True)
            elif exif[orientation] == 8: img = img.rotate(90, expand=True)
        except (AttributeError, KeyError, IndexError, TypeError):
            print("DEBUG: No EXIF Orientation found.")
            pass

        # 2. Asegurar RGB
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # 3. Aplicar Smart Crop (Local Deep Learning + Heuristics)
        img = smart_crop_image(img)
        
        # 4. Guardar
        img.save(save_path, format='JPEG', quality=85)
        print("DEBUG: Image saved successfully.")
        return True
    except Exception as e:
        print(f"ERROR processing image: {e}")
        with open(save_path, "wb") as f:
            f.write(file_content)
        return False
