
import zipfile
import re
import os
from typing import Dict, Any, List

def get_table_xml(headers: List[str], rows: List[List[str]], table_width_pct: int = 5000) -> str:
    """
    Returns a raw WordProcessingML string for a table with the given headers and data rows.
    """
    # Table Start
    tbl_start = f"""
    <w:tbl>
        <w:tblPr>
            <w:tblStyle w:val="TableGrid"/>
            <w:tblW w:w="{table_width_pct}" w:type="pct"/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tblBorders>
        </w:tblPr>
        <w:tblGrid>
            {'<w:gridCol w:w="1500"/>' * len(headers)}
        </w:tblGrid>
    """

    # Header Row
    header_xml = "<w:tr>"
    for h in headers:
        header_xml += f"""
        <w:tc>
            <w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="DDD9C4"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/><w:b/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>{h}</w:t></w:r></w:p>
        </w:tc>
        """
    header_xml += "</w:tr>"

    # Data Rows
    rows_xml = ""
    for row in rows:
        rows_xml += "<w:tr>"
        for cell_data in row:
            rows_xml += f"""
            <w:tc>
                <w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
                <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:t>{cell_data}</w:t></w:r></w:p>
            </w:tc>
            """
        rows_xml += "</w:tr>"

    tbl_end = "</w:tbl>"
    
    return tbl_start + header_xml + rows_xml + tbl_end

def get_mobile_table_xml(rows: List[List[str]], table_width_pct: int = 5000) -> str:
    """
    Returns a raw WordProcessingML string for a mobile devices table.
    Columns: CANT, EQUIPO, OPERADOR, ESTADO, MARCA, MODELO, NUMERO SERIE, NUMERO IMEI, NUMERO LINEA
    Headers have red background (FF0000)
    """
    headers = ["CANT.", "EQUIPO", "OPERADOR", "ESTADO", "MARCA", "MODELO", "NUMERO SERIE", "NUMERO IMEI", "NUMERO LINEA"]
    
    # Table Start
    tbl_start = f"""
    <w:tbl>
        <w:tblPr>
            <w:tblStyle w:val="TableGrid"/>
            <w:tblW w:w="0" w:type="auto"/>
            <w:jc w:val="left"/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tblBorders>
        </w:tblPr>
        <w:tblGrid>
            <w:gridCol w:w="400"/>
            <w:gridCol w:w="600"/>
            <w:gridCol w:w="600"/>
            <w:gridCol w:w="500"/>
            <w:gridCol w:w="550"/>
            <w:gridCol w:w="700"/>
            <w:gridCol w:w="750"/>
            <w:gridCol w:w="750"/>
            <w:gridCol w:w="650"/>
        </w:tblGrid>
    """

    # Header Row with RED background
    col_widths = ["400", "600", "600", "500", "550", "700", "750", "750", "650"]
    header_xml = "<w:tr>"
    for idx, h in enumerate(headers):
        width = col_widths[idx] if idx < len(col_widths) else "800"
        header_xml += f"""
        <w:tc>
            <w:tcPr><w:tcW w:w="{width}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="FF0000"/></w:tcPr>
            <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:b/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/><w:color w:val="FFFFFF"/></w:rPr><w:t>{h}</w:t></w:r></w:p>
        </w:tc>
        """
    header_xml += "</w:tr>"

    # Data Rows
    rows_xml = ""
    for row in rows:
        rows_xml += "<w:tr>"
        for idx, cell_data in enumerate(row):
            width = col_widths[idx] if idx < len(col_widths) else "800"
            rows_xml += f"""
            <w:tc>
                <w:tcPr><w:tcW w:w="{width}" w:type="dxa"/></w:tcPr>
                <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>{cell_data}</w:t></w:r></w:p>
            </w:tc>
            """
        rows_xml += "</w:tr>"

    tbl_end = "</w:tbl>"
    
    return tbl_start + header_xml + rows_xml + tbl_end


def replace_variables_in_docx(source_path: str, dest_path: str, variables: Dict[str, Any], table_xml_map: Dict[str, str] = None) -> bool:
    """
    Replace variables in docx using robust regex.
    handles split tags in variables (e.g. {{<tag>VAR</tag>}}).
    
    Args:
        source_path: Path to source docx
        dest_path: Path to write result
        variables: Dict of KEY -> Value to replace. Key should NOT include {{}}.
        table_xml_map: Optional Dict of KEY -> XML_STRING for injecting tables. 
                       If a key is in this map, it bypasses standard string replacement 
                       and uses proper XML injection logic.
    """
    try:
        with zipfile.ZipFile(source_path, 'r') as zin:
            with zipfile.ZipFile(dest_path, 'w') as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    
                    # Process document body, headers, and footers
                    if item.filename == 'word/document.xml' or item.filename.startswith('word/header') or item.filename.startswith('word/footer'):
                        xml_content = content.decode('utf-8')
                        
                        for key, value in variables.items():
                            val_str = str(value)
                            
                            # Robust Pattern allowing whitespace
                            # Matches {{ KEY }} with optional tags and whitespace
                            pattern = re.compile(r"\{(?:<[^>]+>)*\{(?:<[^>]+>)*\s*" + re.escape(key) + r"\s*(?:<[^>]+>)*\}(?:<[^>]+>)*\}")
                            
                            # Check if this key corresponds to a pre-generated table XML
                            if table_xml_map and key in table_xml_map:
                                table_xml = table_xml_map[key]
                                # Hacky XML injection: Break out of current run/paragraph, insert table, start new
                                replacement = f"</w:t></w:r></w:p>{table_xml}<w:p><w:r><w:t>"
                                xml_content = pattern.sub(replacement, xml_content)
                            else:
                                xml_content = pattern.sub(val_str, xml_content)
                            
                        content = xml_content.encode('utf-8')
                    
                    zout.writestr(item, content)
        return True
    except Exception as e:
        print(f"Error in replace_variables_in_docx: {e}")
        return False
