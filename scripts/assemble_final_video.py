import os
import subprocess
import imageio_ffmpeg

SUBMISSION_DIR = r"C:\Users\kiran\AERIS-Submission"
SCENES_DIR = os.path.join(SUBMISSION_DIR, "scenes")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

TARGET_CONFIGS = [
    {"id": "scene1", "duration": 25.0},
    {"id": "scene2", "duration": 20.0},
    {"id": "scene3", "duration": 25.0},
    {"id": "scene4", "duration": 30.0},
    {"id": "scene5", "duration": 20.0},
    {"id": "scene6", "duration": 25.0},
    {"id": "scene7", "duration": 20.0},
    {"id": "scene8", "duration": 15.0},
]

def get_duration(file_path):
    cmd = [FFMPEG, "-i", file_path]
    p = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    for line in p.stderr.splitlines():
        if "Duration:" in line:
            parts = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = parts.split(":")
            return float(h) * 3600 + float(m) * 60 + float(s)
    return 0.0

def standardize_scenes():
    standardized = []
    for cfg in TARGET_CONFIGS:
        raw_webm = os.path.join(SCENES_DIR, f"{cfg['id']}.webm")
        out_mp4 = os.path.join(SCENES_DIR, f"{cfg['id']}_std.mp4")
        target_dur = cfg["duration"]
        
        raw_dur = get_duration(raw_webm)
        print(f"[{cfg['id']}] Raw duration: {raw_dur:.2f}s -> Standardizing to {target_dur:.2f}s @ 1080p 30fps")
        
        # Scale to 1920x1080, force 30fps, trim/pad to exact target_dur
        pad_needed = max(0.0, target_dur - raw_dur)
        vf_filter = (
            f"scale=1920:1080:force_original_aspect_ratio=decrease,"
            f"pad=1920:1080:(ow-iw)/2:(oh-ih)/2,"
            f"fps=30"
        )
        if pad_needed > 0:
            vf_filter += f",tpad=stop_mode=clone:stop_duration={pad_needed:.3f}"
            
        cmd = [
            FFMPEG, "-y",
            "-i", raw_webm,
            "-vf", vf_filter,
            "-t", f"{target_dur:.3f}",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            out_mp4
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        final_d = get_duration(out_mp4)
        print(f"  ✓ Standardized {cfg['id']}: {final_d:.2f}s ({os.path.getsize(out_mp4)} bytes)")
        standardized.append(out_mp4)
    return standardized

def assemble_master_video(standardized_files):
    concat_txt = os.path.join(SUBMISSION_DIR, "video_concat.txt")
    with open(concat_txt, "w") as f:
        for p in standardized_files:
            f.write(f"file '{p.replace('\\', '/')}'\n")
            
    video_only = os.path.join(SUBMISSION_DIR, "combined_video_only.mp4")
    print("\n=== Concatenating 8 video scenes ===")
    cmd_concat = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_txt,
        "-c", "copy",
        video_only
    ]
    subprocess.run(cmd_concat, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
    video_dur = get_duration(video_only)
    print(f"Combined video duration: {video_dur:.2f}s")
    
    # Merge audio narration and soft subtitles
    audio_file = os.path.join(SUBMISSION_DIR, "full_narration.mp3")
    srt_file = os.path.join(SUBMISSION_DIR, "aeris-subtitles.srt")
    final_output = os.path.join(SUBMISSION_DIR, "aeris-official-demo.mp4")
    
    print("\n=== Merging video, narration audio, and subtitles ===")
    cmd_merge = [
        FFMPEG, "-y",
        "-i", video_only,
        "-i", audio_file,
        "-i", srt_file,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-map", "2:s:0",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-c:s", "mov_text",
        "-metadata:s:s:0", "language=eng",
        "-shortest",
        final_output
    ]
    subprocess.run(cmd_merge, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
    
    final_dur = get_duration(final_output)
    final_size = os.path.getsize(final_output)
    print(f"\n========================================================")
    print(f"FINAL MASTER DEMO VIDEO GENERATED!")
    print(f"Path: {final_output}")
    print(f"Duration: {final_dur:.2f} seconds ({int(final_dur//60)}m {int(final_dur%60)}s)")
    print(f"File Size: {final_size / (1024*1024):.2f} MB")
    print(f"========================================================")
    
    # Verification with ffprobe inspection
    verify_cmd = [FFMPEG, "-i", final_output]
    probe_res = subprocess.run(verify_cmd, stderr=subprocess.PIPE, text=True)
    print("\n--- FFprobe Inspection Stream Details ---")
    for line in probe_res.stderr.splitlines():
        if any(k in line for k in ["Duration:", "Stream #", "Video:", "Audio:", "Subtitle:"]):
            print("  ", line.strip())

if __name__ == "__main__":
    std_files = standardize_scenes()
    assemble_master_video(std_files)
