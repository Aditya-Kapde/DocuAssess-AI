import sys
print(sys.executable)
import unstructured
import unstructured.partition.pdf
from unstructured.partition.pdf import document_to_element_list
import unstructured_inference
from unstructured_inference.inference.layout import process_file_with_model
print('OK')
