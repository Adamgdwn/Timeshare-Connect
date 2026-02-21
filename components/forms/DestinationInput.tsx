type DestinationInputProps = {
  defaultValue?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
};

const DESTINATION_OPTIONS = [
  "Orlando",
  "Las Vegas",
  "Myrtle Beach",
  "Miami",
  "Maui",
  "Cabo San Lucas",
  "Cancun",
  "Punta Cana",
  "Honolulu",
  "Scottsdale",
  "San Diego",
  "Whistler",
];

export default function DestinationInput({
  defaultValue,
  name = "q",
  placeholder = "Orlando, Maui, Marriott...",
  required = false,
  className = "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm",
  labelClassName = "block text-xs font-medium text-zinc-700",
}: DestinationInputProps) {
  const listId = `${name}-destination-options`;

  return (
    <label className={labelClassName}>
      Destination or resort
      <input
        className={className}
        defaultValue={defaultValue}
        list={listId}
        name={name}
        placeholder={placeholder}
        required={required}
      />
      <datalist id={listId}>
        {DESTINATION_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}

