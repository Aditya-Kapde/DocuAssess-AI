import sys
sys.path.insert(0, r'C:\Users\kapde\OneDrive\Desktop\QBG\DocuAssess-AI\python-service')
from services.layout_service import analyze_pdf_layout, crop_visuals
from app import crop_visuals_endpoint
print('All imports successful')
print('crop_visuals:', crop_visuals)
print('crop_visuals_endpoint:', crop_visuals_endpoint)
