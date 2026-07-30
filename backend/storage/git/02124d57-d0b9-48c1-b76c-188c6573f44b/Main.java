public class Main {
    public static void main(String[] args) {
        int count = 1;

        while (true) {
            System.out.println("Count: " + count++);
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                System.out.println("Interrupted");
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}