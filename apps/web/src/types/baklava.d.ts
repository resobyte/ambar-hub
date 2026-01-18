// Type declarations for @trendyol/baklava React components
// These override some of the strict typings to allow flexible usage

declare module '@trendyol/baklava/dist/baklava-react' {
    import { ComponentType, ReactNode } from 'react';

    interface BlButtonProps {
        variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
        size?: 'small' | 'medium' | 'large';
        kind?: 'default' | 'outline' | 'text';
        icon?: string;
        label?: string;
        loading?: boolean;
        disabled?: boolean;
        type?: 'submit' | 'button' | 'reset';
        onBlClick?: (e: any) => void;
        children?: ReactNode;
        className?: string;
        [key: string]: any;
    }

    interface BlInputProps {
        label?: string;
        helpText?: string;
        placeholder?: string;
        value?: string;
        type?: string;
        size?: 'small' | 'medium' | 'large';
        icon?: string;
        disabled?: boolean;
        required?: boolean;
        invalid?: boolean;
        name?: string;
        onBlInput?: (e: any) => void;
        className?: string;
        [key: string]: any;
    }

    interface BlTextareaProps {
        label?: string;
        helpText?: string;
        placeholder?: string;
        value?: string;
        size?: 'small' | 'medium' | 'large';
        rows?: number;
        maxlength?: number;
        disabled?: boolean;
        required?: boolean;
        invalid?: boolean;
        name?: string;
        onBlInput?: (e: any) => void;
        className?: string;
        [key: string]: any;
    }

    interface BlSelectProps {
        value?: string;
        placeholder?: string;
        label?: string;
        helpText?: string;
        size?: 'small' | 'medium' | 'large';
        disabled?: boolean;
        required?: boolean;
        invalid?: boolean;
        clearable?: boolean;
        loading?: boolean;
        'search-bar'?: boolean;
        onBlSelect?: (e: any) => void;
        onBlSearch?: (e: any) => void;
        children?: ReactNode;
        className?: string;
        [key: string]: any;
    }

    interface BlSelectOptionProps {
        value?: string;
        disabled?: boolean;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlBadgeProps {
        variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
        size?: 'small' | 'medium' | 'large';
        icon?: string;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlSpinnerProps {
        size?: 'small' | 'medium' | 'large';
        [key: string]: any;
    }

    interface BlSwitchProps {
        checked?: boolean;
        disabled?: boolean;
        onBlToggle?: (e: any) => void;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlRadioGroupProps {
        name?: string;
        value?: string;
        onBlChange?: (e: any) => void;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlRadioProps {
        value?: string;
        disabled?: boolean;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlDialogProps {
        open?: boolean;
        caption?: string;
        size?: 'small' | 'medium' | 'large';
        onBlClose?: () => void;
        onBlOverlayClick?: () => void;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlAlertProps {
        variant?: 'info' | 'success' | 'warning' | 'danger';
        icon?: boolean;
        closable?: boolean;
        caption?: string;
        description?: string;
        onBlClose?: () => void;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlTabGroupProps {
        onChange?: (e: any) => void;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlTabProps {
        name?: string;
        slot?: string;
        disabled?: boolean;
        icon?: string;
        badge?: string;
        selected?: boolean;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlTabPanelProps {
        tab?: string;
        children?: ReactNode;
        [key: string]: any;
    }

    export const BlButton: ComponentType<BlButtonProps>;
    export const BlInput: ComponentType<BlInputProps>;
    export const BlTextarea: ComponentType<BlTextareaProps>;
    export const BlSelect: ComponentType<BlSelectProps>;
    export const BlSelectOption: ComponentType<BlSelectOptionProps>;
    export const BlBadge: ComponentType<BlBadgeProps>;
    export const BlSpinner: ComponentType<BlSpinnerProps>;
    export const BlSwitch: ComponentType<BlSwitchProps>;
    export const BlRadioGroup: ComponentType<BlRadioGroupProps>;
    export const BlRadio: ComponentType<BlRadioProps>;
    export const BlDialog: ComponentType<BlDialogProps>;
    export const BlAlert: ComponentType<BlAlertProps>;
    export const BlTabGroup: ComponentType<BlTabGroupProps>;
    export const BlTab: ComponentType<BlTabProps>;
    export const BlTabPanel: ComponentType<BlTabPanelProps>;

    // Table Components
    interface BlTableProps {
        sortable?: boolean;
        selectable?: boolean;
        multiple?: boolean;
        selected?: string[];
        'sort-key'?: string;
        'sort-direction'?: string;
        'sticky-first-column'?: boolean;
        'sticky-last-column'?: boolean;
        onBlSort?: (e: any) => void;
        onBlRowSelect?: (e: any) => void;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlTableHeaderProps {
        slot?: string;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlTableBodyProps {
        slot?: string;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlTableRowProps {
        'selection-key'?: string;
        disabled?: boolean;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlTableCellProps {
        style?: any;
        children?: ReactNode;
        [key: string]: any;
    }

    interface BlTableHeaderCellProps {
        'sort-key'?: string;
        style?: any;
        children?: ReactNode;
        [key: string]: any;
    }

    // Pagination
    interface BlPaginationProps {
        'current-page'?: number;
        'total-items'?: number;
        'items-per-page'?: number;
        'has-jumper'?: boolean;
        'jumper-label'?: string;
        'has-select'?: boolean;
        'select-label'?: string;
        'items-per-page-options'?: number[];
        onBlChange?: (e: any) => void;
        [key: string]: any;
    }

    export const BlTable: ComponentType<BlTableProps>;
    export const BlTableHeader: ComponentType<BlTableHeaderProps>;
    export const BlTableBody: ComponentType<BlTableBodyProps>;
    export const BlTableRow: ComponentType<BlTableRowProps>;
    export const BlTableCell: ComponentType<BlTableCellProps>;
    export const BlTableHeaderCell: ComponentType<BlTableHeaderCellProps>;
    export const BlPagination: ComponentType<BlPaginationProps>;
}

declare module '@trendyol/baklava' {
    export function setIconPath(path: string): void;
}
