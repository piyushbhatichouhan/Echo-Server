import sys
import time

def progress_bar(total):
    for i in range(total + 1):
        percent = (i / total) * 100
        bar = '█' * (i // 2) + '-' * ((total - i) // 2)
        # \r moves the cursor back to the start of the line
        sys.stdout.write(f'\rLoading: |{bar}| {percent:.1f}% Complete')
        sys.stdout.flush()
        time.sleep(0.05)
    print("\n\n[ Process Completed Successfully ]")

progress_bar(40)
