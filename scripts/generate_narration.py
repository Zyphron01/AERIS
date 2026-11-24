import asyncio
import os
import subprocess
import imageio_ffmpeg
import edge_tts

OUTPUT_DIR = r"C:\Users\kiran\AERIS-Submission"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

SCENES = [
    {
        "id": "scene1",
        "target_duration": 25.0,
        "rate": "+15%",
        "text": (
            "Every day, millions of people check the air quality index. "
            "They see a number, a color, or a warning. But an important question remains: what should they actually do? "
            "Should they exercise outdoors? Open their windows? Change their commute? Or improve the air inside their homes? "
            "Most dashboards describe air pollution. They don't turn that information into practical, personal decisions."
        )
    },
    {
        "id": "scene2",
        "target_duration": 20.0,
        "rate": "+2%",
        "text": (
            "Introducing AERIS — your personal air quality decision companion. "
            "Know your air. Shape your day. "
            "AERIS brings environmental intelligence and everyday decision-making into one unified experience. "
            "Let's explore the working MVP."
        )
    },
    {
        "id": "scene3",
        "target_duration": 25.0,
        "rate": "+10%",
        "text": (
            "First, the Live Air Monitor. AERIS retrieves weather and modeled air-quality information using Open-Meteo. "
            "Users can select a supported city, explore pollutant concentrations, examine forecasts, and understand a CPCB-method Indian AQI estimate. "
            "Importantly, AERIS explains the source and limitations of this information. Modeled forecasts are not presented as certified sensor measurements."
        )
    },
    {
        "id": "scene4",
        "target_duration": 30.0,
        "rate": "+0%",
        "text": (
            "But air quality alone isn't the full story. Different households have different needs. "
            "With a short onboarding process, AERIS learns the user's selected routines and household preferences. "
            "Its deterministic decision engine converts those inputs and available environmental data into three prioritized daily actions. "
            "Each recommendation includes a clear reason and, where appropriate, a Plan B when conditions change."
        )
    },
    {
        "id": "scene5",
        "target_duration": 20.0,
        "rate": "+0%",
        "text": (
            "Next is the Indoor Air Coach. "
            "Users can explore practical ventilation and filtration guidance and calculate an approximate purifier clean-air delivery requirement using their room dimensions. "
            "The tool makes its assumptions visible instead of inventing indoor sensor readings."
        )
    },
    {
        "id": "scene6",
        "target_duration": 25.0,
        "rate": "+0%",
        "text": (
            "Now, the What-If Simulator. "
            "Users can compare alternative timings or hypothetical choices and inspect the differences. "
            "Decision Receipts explain the assumptions, source data, and rules behind the result. "
            "That means the output is understandable, not just a black-box recommendation."
        )
    },
    {
        "id": "scene7",
        "target_duration": 20.0,
        "rate": "+14%",
        "text": (
            "AERIS also integrates Google Gemini to explain decisions in accessible language. "
            "Trusted recommendations and numerical evidence remain controlled by validated application logic. "
            "For users who want to retain their decisions, optional Supabase PostgreSQL cloud saving provides authenticated persistence with row-level security. "
            "Guest access remains available."
        )
    },
    {
        "id": "scene8",
        "target_duration": 15.0,
        "rate": "-2%",
        "text": (
            "Our goal is simple: transform air-quality information into understandable choices people can act on. "
            "AERIS. Know your air. Shape your day."
        )
    }
]

def get_audio_duration(file_path):
    cmd = [FFMPEG, "-i", file_path]
    p = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    for line in p.stderr.splitlines():
        if "Duration:" in line:
            parts = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = parts.split(":")
            return float(h) * 3600 + float(m) * 60 + float(s)
    return 0.0

async def generate_scene_audio(scene, voice="en-US-GuyNeural"):
    raw_path = os.path.join(OUTPUT_DIR, f"{scene['id']}_raw.mp3")
    padded_path = os.path.join(OUTPUT_DIR, f"{scene['id']}.mp3")
    
    rate = scene.get("rate", "+0%")
    communicate = edge_tts.Communicate(scene['text'], voice, rate=rate)
    await communicate.save(raw_path)
    
    raw_dur = get_audio_duration(raw_path)
    target = scene['target_duration']
    print(f"[{scene['id']}] Speech generated: {raw_dur:.2f}s (Slot Target: {target:.1f}s)")
    
    # Pad audio with silence to reach exactly target_duration without truncating speech
    pad_needed = max(0.0, target - raw_dur)
    
    cmd = [
        FFMPEG, "-y", "-i", raw_path,
        "-af", f"apad=pad_dur={pad_needed:.3f}",
        "-t", f"{target:.3f}",
        padded_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    final_dur = get_audio_duration(padded_path)
    print(f"[{scene['id']}] Final padded slot: {final_dur:.2f}s")
    return padded_path

def generate_subtitles():
    srt_path = os.path.join(OUTPUT_DIR, "aeris-subtitles.srt")
    txt_path = os.path.join(OUTPUT_DIR, "aeris-voiceover-script.txt")
    
    current_time = 0.0
    srt_entries = []
    txt_content = []
    
    for idx, scene in enumerate(SCENES, start=1):
        start_sec = current_time
        end_sec = current_time + scene['target_duration']
        
        def format_srt_time(sec):
            hrs = int(sec // 3600)
            mins = int((sec % 3600) // 60)
            secs = int(sec % 60)
            ms = int((sec - int(sec)) * 1000)
            return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"
            
        srt_entries.append(
            f"{idx}\n{format_srt_time(start_sec)} --> {format_srt_time(end_sec - 0.5)}\n{scene['text']}\n"
        )
        txt_content.append(f"[{format_srt_time(start_sec)} - {format_srt_time(end_sec)}] {scene['id'].upper()}:\n{scene['text']}\n")
        current_time = end_sec
        
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_entries))
        
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(txt_content))
        
    print(f"Generated subtitles: {srt_path}")
    print(f"Generated script: {txt_path}")

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    padded_files = []
    for scene in SCENES:
        path = await generate_scene_audio(scene)
        padded_files.append(path)
        
    concat_list = os.path.join(OUTPUT_DIR, "concat_audio.txt")
    with open(concat_list, "w") as f:
        for p in padded_files:
            f.write(f"file '{p.replace('\\', '/')}'\n")
            
    full_audio = os.path.join(OUTPUT_DIR, "full_narration.mp3")
    cmd = [
        FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", concat_list,
        "-c", "copy", full_audio
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    total_dur = get_audio_duration(full_audio)
    print(f"=== FULL NARRATION GENERATED ===")
    print(f"Path: {full_audio}")
    print(f"Total Duration: {total_dur:.2f}s (Target: 180.00s)")
    
    generate_subtitles()

if __name__ == "__main__":
    asyncio.run(main())
