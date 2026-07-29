import os
import math
from PIL import Image, ImageDraw, ImageFont

PRIMARY_COLOR = '#1A5C8A' # Deep blue from theme
WHITE_COLOR = '#FFFFFF'

def get_heart_points(steps=300):
    points = []
    
    # 1. Cubic Bezier from (19, 14) to (22, 8.5)
    p0, p1, p2, p3 = (19.0, 14.0), (20.49, 12.54), (22.0, 10.79), (22.0, 8.5)
    for i in range(steps):
        t = i / steps
        x = (1-t)**3 * p0[0] + 3*(1-t)**2 * t * p1[0] + 3*(1-t) * t**2 * p2[0] + t**3 * p3[0]
        y = (1-t)**3 * p0[1] + 3*(1-t)**2 * t * p1[1] + 3*(1-t) * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
        
    # 2. Arc from (22, 8.5) to (16.5, 3)
    center = (16.5, 8.5)
    r = 5.5
    for i in range(steps):
        angle = 0.0 + (-90.0 - 0.0) * (i / steps)
        rad = math.radians(angle)
        x = center[0] + r * math.cos(rad)
        y = center[1] + r * math.sin(rad)
        points.append((x, y))
        
    # 3. Cubic Bezier from (16.5, 3) to (12, 5)
    p0, p1, p2, p3 = (16.5, 3.0), (14.74, 3.0), (13.5, 3.5), (12.0, 5.0)
    for i in range(steps):
        t = i / steps
        x = (1-t)**3 * p0[0] + 3*(1-t)**2 * t * p1[0] + 3*(1-t) * t**2 * p2[0] + t**3 * p3[0]
        y = (1-t)**3 * p0[1] + 3*(1-t)**2 * t * p1[1] + 3*(1-t) * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
        
    # 4. Cubic Bezier from (12, 5) to (7.5, 3)
    p0, p1, p2, p3 = (12.0, 5.0), (10.5, 3.5), (9.26, 3.0), (7.5, 3.0)
    for i in range(steps):
        t = i / steps
        x = (1-t)**3 * p0[0] + 3*(1-t)**2 * t * p1[0] + 3*(1-t) * t**2 * p2[0] + t**3 * p3[0]
        y = (1-t)**3 * p0[1] + 3*(1-t)**2 * t * p1[1] + 3*(1-t) * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
        
    # 5. Arc from (7.5, 3) to (2, 8.5)
    center = (7.5, 8.5)
    r = 5.5
    for i in range(steps):
        angle = -90.0 + (-180.0 - (-90.0)) * (i / steps)
        rad = math.radians(angle)
        x = center[0] + r * math.cos(rad)
        y = center[1] + r * math.sin(rad)
        points.append((x, y))
        
    # 6. Cubic Bezier from (2, 8.5) to (5, 14)
    p0, p1, p2, p3 = (2.0, 8.5), (2.0, 10.8), (3.5, 12.55), (5.0, 14.0)
    for i in range(steps):
        t = i / steps
        x = (1-t)**3 * p0[0] + 3*(1-t)**2 * t * p1[0] + 3*(1-t) * t**2 * p2[0] + t**3 * p3[0]
        y = (1-t)**3 * p0[1] + 3*(1-t)**2 * t * p1[1] + 3*(1-t) * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
        
    # 7. Line from (5, 14) to (12, 21)
    for i in range(steps):
        t = i / steps
        x = 5.0 + (12.0 - 5.0) * t
        y = 14.0 + (21.0 - 14.0) * t
        points.append((x, y))
        
    # 8. Line from (12, 21) to (19, 14)
    for i in range(steps):
        t = i / steps
        x = 12.0 + (19.0 - 12.0) * t
        y = 21.0 + (14.0 - 21.0) * t
        points.append((x, y))
        
    return points

def get_pulse_points(steps=300):
    points = []
    vertices = [
        (3.22, 12.0),
        (9.5, 12.0),
        (11.0, 9.0),
        (13.0, 15.0),
        (14.5, 12.0),
        (18.28, 12.0)
    ]
    for idx in range(len(vertices) - 1):
        v_start = vertices[idx]
        v_end = vertices[idx+1]
        for i in range(steps):
            t = i / steps
            x = v_start[0] + (v_end[0] - v_start[0]) * t
            y = v_start[1] + (v_end[1] - v_start[1]) * t
            points.append((x, y))
    points.append(vertices[-1])
    return points

def draw_icon_on_canvas(size, scale_factor, bg_color, stroke_color, stroke_width_factor=2.5, is_rounded=False):
    # Create canvas at 4x resolution for super-smooth scaling
    render_size = size * 4
    F = scale_factor * 4
    
    # Background
    if bg_color is None:
        img = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
    else:
        img = Image.new("RGBA", (render_size, render_size), bg_color)
        
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle if requested (e.g. for standard icon)
    if is_rounded and bg_color is not None:
        img = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        radius = render_size * 0.22 # iOS standard icon radius (22%)
        draw.rounded_rectangle([0, 0, render_size, render_size], radius=radius, fill=bg_color)
        
    # Stroke properties
    stroke_width = int(stroke_width_factor * F)
    R = stroke_width // 2
    
    # Scale and center function
    def scale_pt(pt):
        x = (pt[0] - 12.0) * F + (render_size / 2)
        y = (pt[1] - 12.0) * F + (render_size / 2)
        return (x, y)
        
    # Get points
    heart_pts = [scale_pt(pt) for pt in get_heart_points()]
    pulse_pts = [scale_pt(pt) for pt in get_pulse_points()]
    
    # Draw heart (outline only via overlapping circles)
    for pt in heart_pts:
        draw.ellipse([pt[0] - R, pt[1] - R, pt[0] + R, pt[1] + R], fill=stroke_color)
        
    # Draw pulse
    for pt in pulse_pts:
        draw.ellipse([pt[0] - R, pt[1] - R, pt[0] + R, pt[1] + R], fill=stroke_color)
        
    # Downscale to target size with Lanczos
    return img.resize((size, size), Image.Resampling.LANCZOS)

def generate_splash_screen(width, height, icon_size, text_ocno, text_detect, out_path):
    # Create the splash screen image at 2x resolution to be crisp
    render_w = width * 2
    render_h = height * 2
    
    img = Image.new("RGBA", (render_w, render_h), WHITE_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Generate the icon at 2x size (transparent, primary blue)
    icon_render_size = icon_size * 2
    icon_img = draw_icon_on_canvas(icon_render_size, icon_render_size * 0.65 / 24, None, PRIMARY_COLOR, stroke_width_factor=2.2)
    
    # Paste icon in center
    icon_x = (render_w - icon_render_size) // 2
    icon_y = (render_h - icon_render_size) // 2 - 120 # slightly above center
    img.paste(icon_img, (icon_x, icon_y), icon_img)
    
    # Draw Text "OcnoDetect"
    try:
        font_path = "C:\\Windows\\Fonts\\segoeuib.ttf"
        font = ImageFont.truetype(font_path, 96) # Large bold font
    except Exception:
        font = ImageFont.load_default()
        
    # Measure text sizes
    bbox_ocno = draw.textbbox((0, 0), text_ocno, font=font)
    w_ocno = bbox_ocno[2] - bbox_ocno[0]
    
    bbox_detect = draw.textbbox((0, 0), text_detect, font=font)
    w_detect = bbox_detect[2] - bbox_detect[0]
    
    total_w = w_ocno + w_detect
    
    text_x = (render_w - total_w) // 2
    text_y = icon_y + icon_render_size + 100
    
    # Draw "Ocno" in dark color
    draw.text((text_x, text_y), text_ocno, fill='#0A1520', font=font)
    # Draw "Detect" in primary blue
    draw.text((text_x + w_ocno, text_y), text_detect, fill=PRIMARY_COLOR, font=font)
    
    # Resize to target splash size
    final_img = img.resize((width, height), Image.Resampling.LANCZOS)
    final_img.convert("RGB").save(out_path, "PNG")

def main():
    assets_dir = './assets'
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
        print("Created assets directory.")
        
    # 1. Generate icon.png (1024x1024, white background, rounded, primary heart-pulse)
    icon_img = draw_icon_on_canvas(1024, 1024 * 0.70 / 24, WHITE_COLOR, PRIMARY_COLOR, stroke_width_factor=2.4, is_rounded=True)
    icon_img.convert("RGB").save(os.path.join(assets_dir, 'icon.png'), 'PNG')
    print("Generated assets/icon.png")
    
    # 2. Generate adaptive-icon.png (1024x1024, transparent background, primary heart-pulse, smaller scale to fit safe zone)
    # Scale: 0.52 of the viewport
    adaptive_img = draw_icon_on_canvas(1024, 1024 * 0.52 / 24, None, PRIMARY_COLOR, stroke_width_factor=2.4, is_rounded=False)
    adaptive_img.save(os.path.join(assets_dir, 'adaptive-icon.png'), 'PNG')
    print("Generated assets/adaptive-icon.png")
    
    # 3. Generate favicon.png (48x48, white background, rounded, primary heart-pulse)
    favicon_img = draw_icon_on_canvas(48, 48 * 0.70 / 24, WHITE_COLOR, PRIMARY_COLOR, stroke_width_factor=2.4, is_rounded=True)
    favicon_img.save(os.path.join(assets_dir, 'favicon.png'), 'PNG')
    print("Generated assets/favicon.png")
    
    # 4. Generate splash.png (1280x1920, centered primary icon, text)
    generate_splash_screen(1280, 1920, 320, "Ocno", "Detect", os.path.join(assets_dir, 'splash.png'))
    print("Generated assets/splash.png")

if __name__ == '__main__':
    main()
