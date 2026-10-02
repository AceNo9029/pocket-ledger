# Theme presets: light + dark token sets (semantic chart colours stay fixed).
PRESETS = {
 "atoll":  {"name":"Atoll","light":dict(bg="#F1F5FA",surface="#FFFFFF",sunk="#E4EBF4",ink="#111C2B",ink2="#46566B",ink3="#76859A",line="#D6DFEA",accent="#1D5FAE",accentInk="#FFFFFF",bar="#2A6FC4"),
                           "dark": dict(bg="#0C1320",surface="#141D2C",sunk="#1C2738",ink="#E4ECF6",ink2="#A6B4C7",ink3="#7A889C",line="#26334A",accent="#6FA8F5",accentInk="#071629",bar="#5B98EA")},
 "sand":   {"name":"Sandbank","light":dict(bg="#F5F1E8",surface="#FFFDF8",sunk="#ECE5D6",ink="#211D14",ink2="#5B5444",ink3="#8A8270",line="#E0D7C4",accent="#4E6A2C",accentInk="#FFFFFF",bar="#5F7F37"),
                           "dark": dict(bg="#16140F",surface="#201D16",sunk="#2A261D",ink="#EFEAE0",ink2="#BDB4A2",ink3="#8F8775",line="#363125",accent="#A8C46B",accentInk="#1A2108",bar="#98B65C")},
 "monsoon":{"name":"Monsoon","light":dict(bg="#EDEFF3",surface="#FFFFFF",sunk="#E1E5EC",ink="#161A23",ink2="#4B5262",ink3="#7A8192",line="#D3D8E1",accent="#3B4A6E",accentInk="#FFFFFF",bar="#4D5E88"),
                           "dark": dict(bg="#111419",surface="#191D24",sunk="#212630",ink="#E5E8EE",ink2="#A9B0BE",ink3="#7C8496",line="#2B313D",accent="#9DB0DD",accentInk="#111A2E",bar="#8EA2D4")},
 "sunset": {"name":"Sunset","light":dict(bg="#F7F1F4",surface="#FFFFFF",sunk="#EFE3EA",ink="#22131C",ink2="#5E4655",ink3="#8E7685",line="#E6D5DF",accent="#7B3A6A",accentInk="#FFFFFF",bar="#8E4A7C"),
                           "dark": dict(bg="#181116",surface="#22181F",sunk="#2C2029",ink="#F2E6EE",ink2="#C2AAB9",ink3="#937C8B",line="#3A2B36",accent="#E39BCB",accentInk="#2A0E21",bar="#D689BC")},
}
def block(t): return (f"--bg: {t['bg']}; --surface: {t['surface']}; --sunk: {t['sunk']}; --ink: {t['ink']}; --ink-2: {t['ink2']}; --ink-3: {t['ink3']}; "
                      f"--line: {t['line']}; --accent: {t['accent']}; --accent-ink: {t['accentInk']}; --c-bar: {t['bar']};")
def css():
    out=[]
    for k,p in PRESETS.items():
        out.append(f':root[data-preset="{k}"] {{ {block(p["light"])} }}')
        out.append(f':root[data-preset="{k}"][data-theme="dark"] {{ {block(p["dark"])} }}')
    out.append(':root[data-amoled][data-theme="dark"] { --bg: #000000; --surface: #0B0B0C; --sunk: #151517; --line: #222226; }')
    return "\n".join(out)
def lum(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]; return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b): A,B=sorted([lum(a),lum(b)],reverse=True); return (A+0.05)/(B+0.05)
if __name__=="__main__":
    for k,p in PRESETS.items():
        for m in ("light","dark"):
            t=p[m]; print(k,m,"btn %.1f"%cr(t['accent'],t['accentInk']),"accent/bg %.1f"%cr(t['accent'],t['bg']),"ink3/surface %.1f"%cr(t['ink3'],t['surface']),"ink/bg %.1f"%cr(t['ink'],t['bg']))
