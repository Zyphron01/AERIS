import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

os.makedirs('public/assets', exist_ok=True)

WIDTH, HEIGHT = 1024, 1024

def render_sculpture(theme='light'):
    # Create high-res canvas
    img = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy = WIDTH / 2, HEIGHT / 2
    
    # Atmospheric fluid streamline parameters
    num_ribbons = 38
    points_per_ribbon = 240
    
    # Color palette
    if theme == 'light':
        # Muted teal, cyan mist, charcoal depths, pearl highlights
        base_colors = [
            (13, 148, 136),   # #0D9488 teal-600
            (14, 165, 233),   # #0EA5E9 sky-500
            (15, 118, 110),   # #0F766E teal-700
            (6, 182, 212),    # #06B6D4 cyan-500
            (30, 41, 59),     # #1E293B slate-800
            (45, 212, 191),   # #2DD4BF teal-400
        ]
    else:
        # Luminous electric cyan, celestial teal, radiant mint
        base_colors = [
            (34, 211, 238),   # #22D3EE cyan-400
            (20, 184, 166),   # #14B8A6 teal-500
            (56, 189, 248),   # #38BDF8 sky-400
            (167, 243, 208),  # #A7F3D0 emerald-200
            (125, 211, 252),  # #7DD3FC sky-300
            (94, 234, 212),   # #5EEAD4 teal-300
        ]

    np.random.seed(42)
    
    for r in range(num_ribbons):
        t_offset = r * 0.17
        r_scale = 220 + 130 * math.sin(r * 0.35)
        color = base_colors[r % len(base_colors)]
        
        ribbon_points = []
        for i in range(points_per_ribbon):
            u = i / (points_per_ribbon - 1)
            theta = u * 4.2 * math.pi + t_offset
            
            # Atmospheric vortex parametric torus knot / fluid whorl
            radius = r_scale * (0.8 + 0.35 * math.cos(3 * theta + r))
            z = 90 * math.sin(2 * theta + r * 0.5)
            
            # Swirling turbulence
            turb_x = 45 * math.sin(5 * theta + r * 1.2) * math.cos(theta * 0.5)
            turb_y = 55 * math.cos(4 * theta + r * 0.8) * math.sin(theta * 0.8)
            
            px = cx + (radius + turb_x) * math.cos(theta) * 0.95
            py = cy + (radius * 0.75 + turb_y) * math.sin(theta) * 0.85 + z * 0.4
            
            ribbon_points.append((px, py, z))
        
        # Draw connected curved filaments with varying thickness and opacity
        for i in range(len(ribbon_points) - 1):
            p1 = ribbon_points[i]
            p2 = ribbon_points[i + 1]
            
            # Depth sorting opacity
            depth_factor = (p1[2] + 120) / 240.0
            depth_factor = max(0.2, min(1.0, depth_factor))
            
            if theme == 'light':
                alpha = int(140 * depth_factor)
                line_width = int(2.5 + 3.0 * depth_factor)
            else:
                alpha = int(200 * depth_factor)
                line_width = int(2.5 + 3.5 * depth_factor)
            
            rgba = (*color, alpha)
            draw.line([(p1[0], p1[1]), (p2[0], p2[1])], fill=rgba, width=line_width)

    # Add suspended atmospheric micro-particulates & condensation beads
    num_particles = 1400
    for _ in range(num_particles):
        angle = np.random.uniform(0, 2 * math.pi)
        dist = np.random.normal(240, 95)
        dist = max(60, min(440, dist))
        
        px = cx + dist * math.cos(angle) * (1.0 + 0.25 * math.sin(3 * angle))
        py = cy + dist * math.sin(angle) * (0.8 + 0.2 * math.cos(2 * angle))
        
        size = np.random.uniform(1.2, 4.5)
        color = base_colors[np.random.randint(0, len(base_colors))]
        alpha = int(np.random.uniform(90, 220))
        
        draw.ellipse([px - size, py - size, px + size, py + size], fill=(*color, alpha))
    
    # Apply subtle atmospheric diffusion
    blurred = img.filter(ImageFilter.GaussianBlur(radius=0.7))
    composite = Image.alpha_composite(blurred, img)
    return composite

print("Rendering light sculpture...")
light_img = render_sculpture('light')
light_img.save('public/assets/aeris-sculpture-light.png', 'PNG')

print("Rendering dark sculpture...")
dark_img = render_sculpture('dark')
dark_img.save('public/assets/aeris-sculpture-dark.png', 'PNG')

# Also save high quality static fallback image
print("Saving fallback image...")
light_img.save('public/assets/fallback-air.png', 'PNG')
print("All sculpture assets created successfully!")
