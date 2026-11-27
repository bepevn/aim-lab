from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="AIM FORGE", page_icon="🎯", layout="wide")

BASE = Path(__file__).parent
html = (BASE / "index.html").read_text(encoding="utf-8")
css = (BASE / "style.css").read_text(encoding="utf-8")
js = (BASE / "game.js").read_text(encoding="utf-8")

# Streamlit은 HTML 한 덩어리만 넣을 수 있어서 CSS/JS를 합쳐서 넣는다
html = html.replace('<link rel="stylesheet" href="style.css">', f"<style>{css}</style>")
html = html.replace('<script src="game.js"></script>', f"<script>{js}</script>")

st.markdown(
    "<style>.block-container{padding:0.5rem 1rem}header,footer{visibility:hidden}</style>",
    unsafe_allow_html=True,
)
components.html(html, height=760, scrolling=False)
