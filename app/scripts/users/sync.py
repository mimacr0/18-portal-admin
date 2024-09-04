from PIL import Image, ImageDraw, ImageFont
import base64
import io
import os
import random
import sys

sys.path.append(f"""{os.getenv('BASE_DIR')}/scripts""")

from lib.base.cli import CLI
from lib.base.ws import WS

args = CLI.args()
ws_conf = args.get('ws') or {}

if not ws_conf:
    CLI.out({'status': 'error', 'message': 'WS config not found'})

ws = WS(ws_conf)

if not ws.uid:
    CLI.out({'status': 'error', 'message': 'Connection error'})

res = ws.call('res.users', 'get_portal_users_data', [])

def random_color():
    return (random.randint(50, 190), random.randint(50, 190), random.randint(50, 190))

def user_image(name):
    background_color = random_color()
    image = Image.new('RGB', (500, 500), color=background_color)

    initials = name[0].upper()

    font = ImageFont.truetype(f"""{os.getenv('BASE_DIR')}/scripts/fonts/DejaVuSans.ttf""", 280)
    draw = ImageDraw.Draw(image)

    text_bbox = draw.textbbox((0, 0), initials, font=font)
    text_x = (image.width - (text_bbox[2] - text_bbox[0])) // 2
    text_y = (image.height - (text_bbox[3] - text_bbox[1])) // 2

    draw.text((text_x, text_y - 50), initials, font=font, fill=(255, 255, 255))

    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")

    return base64.b64encode(buffered.getvalue()).decode("utf-8")

items = []

for values in res:
    dbid = values.pop('id')
    values['dbid'] = dbid
    if not values.get('image'):
        values['image'] = user_image(values.get('name'))
    items.append(values)

CLI.out({'status': 'success', 'data': items})
