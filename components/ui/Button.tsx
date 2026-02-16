type ButtonProps = {
  label?: string;
};

export default function Button({ label = "Button" }: ButtonProps) {
  return <button type="button">{label}</button>;
}
